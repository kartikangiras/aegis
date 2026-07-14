"""AWS memory provider — zero-cost infrastructure.

Uses only AWS Free Tier services:

    * Amazon S3  (5 GB free / 12 months)   — raw artifact archival
    * Amazon DynamoDB  (25 GB always free)  — persistent graph + dataset storage

Amazon Bedrock is **optional**. If ``BEDROCK_MODEL_ID`` is blank, recall falls
back to keyword scoring identical to ``InMemoryProvider``. Set the model ID to
upgrade to Claude-powered answer synthesis.

DynamoDB tables (auto-created on first run, PAY_PER_REQUEST billing):

    {prefix}-datasets   PK: id           — dataset registry
    {prefix}-nodes      PK: dataset_id   SK: node_id   — graph nodes
    {prefix}-edges      PK: dataset_id   SK: edge_id   — graph edges

All tables use on-demand (PAY_PER_REQUEST) billing which falls inside the free
tier for typical research workloads.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any

from app.config import settings
from memory.base import (
    DatasetInfo,
    EvidenceItem,
    GraphData,
    GraphEdge,
    GraphNode,
    GraphStats,
    HealthStatus,
    MemoryProvider,
    RecallResult,
)

logger = logging.getLogger("aegis.providers.aws")

# ---------------------------------------------------------------------------
# Concept extraction (same heuristics as InMemoryProvider so the graph is
# identical quality regardless of backend).
# ---------------------------------------------------------------------------
_CAP_CONCEPT = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b")
_CODE_CONCEPT = re.compile(
    r"\b(transformer|attention|agent|rag|embeddings?|llm|memory|graph|"
    r"benchmark|dataset|ontology|knowledge graph|self-attention)\b",
    re.I,
)
_STOP = {
    "The", "This", "That", "These", "Those", "We", "They", "It",
    "An", "A", "In", "On", "And", "Or", "But", "For", "To", "Of",
    "Is", "Are", "Was", "Were", "Be", "Been", "Has", "Have",
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _extract_concepts(text: str) -> set[str]:
    concepts = {m.group(0) for m in _CAP_CONCEPT.finditer(text)} | {
        m.group(0).title() for m in _CODE_CONCEPT.finditer(text)
    }
    return {c for c in concepts if c not in _STOP and len(c) > 2}


# ---------------------------------------------------------------------------
# DynamoDB helpers — Decimal ↔ float conversion required by boto3.
# ---------------------------------------------------------------------------
try:
    from decimal import Decimal

    def _to_ddb(obj: Any) -> Any:  # python → DynamoDB-safe
        if isinstance(obj, float):
            return Decimal(str(obj))
        if isinstance(obj, dict):
            return {k: _to_ddb(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_to_ddb(v) for v in obj]
        return obj

    def _from_ddb(obj: Any) -> Any:  # DynamoDB → python
        if isinstance(obj, Decimal):
            f = float(obj)
            return int(f) if f.is_integer() else f
        if isinstance(obj, dict):
            return {k: _from_ddb(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_from_ddb(v) for v in obj]
        return obj

except ImportError:
    _to_ddb = lambda x: x  # type: ignore[assignment]
    _from_ddb = lambda x: x  # type: ignore[assignment]


class AWSProvider(MemoryProvider):
    """Memory provider backed by Amazon S3 + DynamoDB.

    Bedrock (Claude) is used for answer synthesis when configured;
    otherwise falls back to keyword-based recall (free, always works).
    """

    backend_name = "aws"

    def __init__(self) -> None:
        import boto3  # lazy — only required when MEMORY_BACKEND=aws

        session = boto3.Session(
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
            aws_session_token=settings.aws_session_token or None,
            region_name=settings.aws_region or "us-east-1",
        )

        self._s3 = session.client("s3")
        self._ddb = session.resource("dynamodb")
        self._bedrock = (
            session.client("bedrock-runtime")
            if settings.bedrock_model_id
            else None
        )
        self._bucket = settings.s3_bucket
        self._prefix = settings.dynamodb_table_prefix or "aegis"

        # Table name helpers
        self._t_datasets = f"{self._prefix}-datasets"
        self._t_nodes = f"{self._prefix}-nodes"
        self._t_edges = f"{self._prefix}-edges"

        # In-process cache to speed up graph operations within a session.
        # DynamoDB is the source of truth; cache is populated on first use.
        self._cache_loaded = False
        self._nodes_cache: dict[str, GraphNode] = {}
        self._edges_cache: dict[str, GraphEdge] = {}
        self._concept_index: dict[str, str] = {}  # concept.lower() → node_id

        self._ensure_infrastructure()

    # ------------------------------------------------------------------ #
    # Infrastructure bootstrap                                           #
    # ------------------------------------------------------------------ #
    def _ensure_infrastructure(self) -> None:
        """Create DynamoDB tables and S3 bucket if they don't exist yet."""
        self._ensure_table(
            self._t_datasets,
            pk=("id", "S"),
        )
        self._ensure_table(
            self._t_nodes,
            pk=("dataset_id", "S"),
            sk=("node_id", "S"),
        )
        self._ensure_table(
            self._t_edges,
            pk=("dataset_id", "S"),
            sk=("edge_id", "S"),
        )
        if self._bucket:
            self._ensure_bucket()

    def _ensure_table(
        self,
        name: str,
        pk: tuple[str, str],
        sk: tuple[str, str] | None = None,
    ) -> None:
        import botocore.exceptions  # type: ignore[import-untyped]

        table = self._ddb.Table(name)
        try:
            table.load()
            return  # already exists
        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"] != "ResourceNotFoundException":
                raise

        key_schema = [{"AttributeName": pk[0], "KeyType": "HASH"}]
        attr_defs = [{"AttributeName": pk[0], "AttributeType": pk[1]}]
        if sk:
            key_schema.append({"AttributeName": sk[0], "KeyType": "RANGE"})
            attr_defs.append({"AttributeName": sk[0], "AttributeType": sk[1]})

        self._ddb.create_table(
            TableName=name,
            KeySchema=key_schema,
            AttributeDefinitions=attr_defs,
            BillingMode="PAY_PER_REQUEST",  # no provisioned capacity → free tier
        )
        table.wait_until_exists()
        logger.info("Created DynamoDB table: %s", name)

    def _ensure_bucket(self) -> None:
        import botocore.exceptions  # type: ignore[import-untyped]

        try:
            self._s3.head_bucket(Bucket=self._bucket)
        except botocore.exceptions.ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("404", "NoSuchBucket"):
                region = settings.aws_region or "us-east-1"
                create_kwargs: dict[str, Any] = {"Bucket": self._bucket}
                if region != "us-east-1":
                    create_kwargs["CreateBucketConfiguration"] = {
                        "LocationConstraint": region
                    }
                self._s3.create_bucket(**create_kwargs)
                logger.info("Created S3 bucket: %s", self._bucket)
            elif code == "403":
                logger.warning("S3 bucket %s exists but access denied.", self._bucket)
            else:
                raise

    # ------------------------------------------------------------------ #
    # Session cache loader                                               #
    # ------------------------------------------------------------------ #
    def _load_cache(self) -> None:
        """Populate in-process caches from DynamoDB on first access."""
        if self._cache_loaded:
            return
        # Load nodes
        table = self._ddb.Table(self._t_nodes)
        resp = table.scan()
        for item in resp.get("Items", []):
            item = _from_ddb(item)
            nid = item["node_id"]
            self._nodes_cache[nid] = GraphNode(
                id=nid,
                label=item.get("label", "Concept"),
                name=item.get("name", ""),
                properties=item.get("properties", {}),
            )
            if item.get("label") == "Concept":
                self._concept_index[item.get("name", "").lower()] = nid

        # Load edges
        table = self._ddb.Table(self._t_edges)
        resp = table.scan()
        for item in resp.get("Items", []):
            item = _from_ddb(item)
            eid = item["edge_id"]
            self._edges_cache[eid] = GraphEdge(
                source=item["source"],
                target=item["target"],
                label=item.get("label", "RELATED_TO"),
                properties=item.get("properties", {}),
            )
        self._cache_loaded = True

    # ------------------------------------------------------------------ #
    # Lifecycle                                                          #
    # ------------------------------------------------------------------ #
    async def remember(self, content: str, *, dataset_name: str | None = None) -> str:
        self._load_cache()
        dataset_id = uuid.uuid4().hex
        name = dataset_name or f"dataset_{len(await self.list_datasets()) + 1}"
        created_at = _now()
        size = len(content.encode("utf-8"))

        # 1. Archive raw content to S3
        if self._bucket:
            try:
                self._s3.put_object(
                    Bucket=self._bucket,
                    Key=f"datasets/{dataset_id}/raw.txt",
                    Body=content.encode("utf-8"),
                    ContentType="text/plain",
                    Metadata={"dataset-name": name, "created-at": created_at},
                )
            except Exception as exc:
                logger.warning("S3 put_object failed (non-fatal): %s", exc)

        # 2. Build in-process graph (same logic as InMemoryProvider)
        node_ids, edge_ids = self._build_graph(dataset_id, name, content, created_at)

        # 3. Persist dataset record to DynamoDB
        self._ddb.Table(self._t_datasets).put_item(
            Item=_to_ddb({
                "id": dataset_id,
                "name": name,
                "created_at": created_at,
                "node_count": len(node_ids),
                "raw_size_bytes": size,
                "node_ids": list(node_ids),
                "edge_ids": list(edge_ids),
            })
        )

        logger.info("remember(): dataset %s (%d nodes, %d edges)", dataset_id, len(node_ids), len(edge_ids))
        return dataset_id

    async def recall(self, query: str, *, dataset_id: str | None = None) -> RecallResult:
        self._load_cache()
        query_terms = {w.lower() for w in re.findall(r"\w+", query) if len(w) > 2}
        if not query_terms:
            return RecallResult(answer="")

        # Determine which datasets to search
        all_datasets = await self.list_datasets()
        if dataset_id:
            scope = [ds for ds in all_datasets if ds.id == dataset_id]
        else:
            scope = all_datasets

        # Retrieve raw content from S3 (if available) else fall back to node names
        chunks: list[tuple[str, str, float]] = []  # (text, source, score)
        for ds in scope:
            text = self._fetch_s3_content(ds.id)
            if text:
                terms = Counter(w.lower() for w in re.findall(r"\w+", text))
                score = float(sum(terms[t] for t in query_terms))
                if score > 0:
                    chunks.append((text, ds.name, score))

        # Fall back to node-name matching when S3 is unavailable
        if not chunks:
            for nid, node in self._nodes_cache.items():
                node_words = {w.lower() for w in re.findall(r"\w+", node.name)}
                score = float(len(query_terms & node_words))
                if score > 0:
                    chunks.append((node.name, node.label, score))

        chunks.sort(key=lambda c: c[2], reverse=True)
        evidence = [
            EvidenceItem(text=t[:300], source=s, node_id="", score=sc)
            for t, s, sc in chunks[:5]
        ]

        if not chunks:
            return RecallResult(
                answer="I don't have any memory relevant to that question yet.",
                dataset_id=dataset_id,
            )

        best_text = chunks[0][0]
        context = "\n\n".join(t[:600] for t, _, _ in chunks[:3])

        # Optional: Bedrock LLM synthesis
        answer = self._bedrock_synthesize(query, context) if self._bedrock else (
            f"Based on memory from {len(scope)} dataset(s), the most relevant "
            f"content mentions: {best_text[:240]}..."
        )

        return RecallResult(answer=answer, evidence=evidence, dataset_id=dataset_id)

    async def improve(self, *, dataset_id: str | None = None) -> dict[str, Any]:
        self._load_cache()
        all_datasets = await self.list_datasets()
        if dataset_id:
            scope_ids = {dataset_id}
        else:
            scope_ids = {ds.id for ds in all_datasets}

        merged = 0
        new_edges = 0

        # Find and merge duplicate Concept nodes
        seen: dict[str, str] = {}
        to_remove: list[str] = []
        for nid, node in list(self._nodes_cache.items()):
            if node.label != "Concept":
                continue
            # Only act on nodes owned by datasets in scope
            if not self._node_in_scope(nid, scope_ids):
                continue
            key = node.name.lower()
            if key in seen:
                canonical = seen[key]
                for eid, edge in list(self._edges_cache.items()):
                    if edge.source == nid:
                        edge.source = canonical
                        new_edges += 1
                    if edge.target == nid:
                        edge.target = canonical
                        new_edges += 1
                to_remove.append(nid)
            else:
                seen[key] = nid

        for nid in to_remove:
            self._nodes_cache.pop(nid, None)
            self._concept_index = {k: v for k, v in self._concept_index.items() if v != nid}
            # Remove from DynamoDB (scan to find dataset_id)
            self._delete_node_from_ddb(nid)
        merged = len(to_remove)

        # Create RELATED_TO edges between co-occurring concepts
        concepts_by_ds: dict[str, list[str]] = defaultdict(list)
        for nid, node in self._nodes_cache.items():
            if node.label == "Concept":
                owner = self._node_owner(nid)
                if owner and owner in scope_ids:
                    concepts_by_ds[owner].append(nid)

        edges_table = self._ddb.Table(self._t_edges)
        for ds_id, nids in concepts_by_ds.items():
            for i in range(len(nids)):
                for j in range(i + 1, len(nids)):
                    eid = f"{nids[i]}->RELATED_TO->{nids[j]}"
                    if eid not in self._edges_cache:
                        edge = GraphEdge(source=nids[i], target=nids[j], label="RELATED_TO")
                        self._edges_cache[eid] = edge
                        edges_table.put_item(Item=_to_ddb({
                            "dataset_id": ds_id,
                            "edge_id": eid,
                            "source": nids[i],
                            "target": nids[j],
                            "label": "RELATED_TO",
                            "properties": {},
                        }))
                        new_edges += 1

        return {
            "merged_duplicates": merged,
            "new_relationships": new_edges,
            "concepts_after": sum(1 for n in self._nodes_cache.values() if n.label == "Concept"),
        }

    async def forget(self, dataset_id: str) -> dict[str, Any]:
        self._load_cache()
        datasets_table = self._ddb.Table(self._t_datasets)
        resp = datasets_table.get_item(Key={"id": dataset_id})
        item = resp.get("Item")
        if not item:
            return {"deleted": False, "dataset_id": dataset_id, "message": "not found"}

        item = _from_ddb(item)
        name = item.get("name", dataset_id)
        node_ids: list[str] = item.get("node_ids", [])
        edge_ids: list[str] = item.get("edge_ids", [])

        # Remove nodes from cache + DynamoDB
        nodes_table = self._ddb.Table(self._t_nodes)
        edges_table = self._ddb.Table(self._t_edges)

        for nid in node_ids:
            self._nodes_cache.pop(nid, None)
            self._concept_index = {k: v for k, v in self._concept_index.items() if v != nid}
            try:
                nodes_table.delete_item(Key={"dataset_id": dataset_id, "node_id": nid})
            except Exception as exc:
                logger.warning("DynamoDB node delete failed: %s", exc)

        for eid in edge_ids:
            self._edges_cache.pop(eid, None)
            try:
                edges_table.delete_item(Key={"dataset_id": dataset_id, "edge_id": eid})
            except Exception as exc:
                logger.warning("DynamoDB edge delete failed: %s", exc)

        # Delete dataset record
        datasets_table.delete_item(Key={"id": dataset_id})

        # Delete S3 raw content
        if self._bucket:
            try:
                self._s3.delete_object(
                    Bucket=self._bucket,
                    Key=f"datasets/{dataset_id}/raw.txt",
                )
            except Exception as exc:
                logger.warning("S3 delete_object failed (non-fatal): %s", exc)

        return {"deleted": True, "dataset_id": dataset_id, "name": name}

    # ------------------------------------------------------------------ #
    # Dataset management                                                 #
    # ------------------------------------------------------------------ #
    async def list_datasets(self) -> list[DatasetInfo]:
        table = self._ddb.Table(self._t_datasets)
        resp = table.scan()
        out = []
        for item in resp.get("Items", []):
            item = _from_ddb(item)
            out.append(DatasetInfo(
                id=item["id"],
                name=item.get("name", ""),
                created_at=item.get("created_at"),
                node_count=int(item.get("node_count", 0)),
                raw_size_bytes=int(item.get("raw_size_bytes", 0)),
            ))
        return out

    # ------------------------------------------------------------------ #
    # Graph + stats                                                      #
    # ------------------------------------------------------------------ #
    async def get_graph(self, *, dataset_id: str | None = None) -> GraphData:
        self._load_cache()
        if dataset_id:
            resp = self._ddb.Table(self._t_datasets).get_item(Key={"id": dataset_id})
            item = resp.get("Item")
            if not item:
                return GraphData()
            item = _from_ddb(item)
            node_id_set = set(item.get("node_ids", []))
            nodes = [n for n in self._nodes_cache.values() if n.id in node_id_set]
        else:
            nodes = list(self._nodes_cache.values())
            node_id_set = {n.id for n in nodes}

        edges = [
            e for e in self._edges_cache.values()
            if e.source in node_id_set and e.target in node_id_set
        ]
        return GraphData(nodes=nodes, edges=edges)

    async def get_stats(self) -> GraphStats:
        self._load_cache()
        datasets = await self.list_datasets()
        nodes = len(self._nodes_cache)
        edges = len(self._edges_cache)
        node_type_counts: dict[str, int] = Counter(n.label for n in self._nodes_cache.values())
        edge_type_counts: dict[str, int] = Counter(e.label for e in self._edges_cache.values())
        max_edges = max(nodes * (nodes - 1), 1)
        density = min(edges / max_edges, 1.0) if nodes > 1 else 0.0
        coverage = min(len(datasets) / 5.0, 1.0)
        quality = round(0.6 * density + 0.4 * coverage, 3)
        return GraphStats(
            node_count=nodes,
            edge_count=edges,
            node_type_counts=dict(node_type_counts),
            edge_type_counts=dict(edge_type_counts),
            dataset_count=len(datasets),
            memory_quality_score=quality,
        )

    # ------------------------------------------------------------------ #
    # Health                                                             #
    # ------------------------------------------------------------------ #
    async def health(self) -> HealthStatus:
        details: dict[str, Any] = {}
        healthy = True

        # DynamoDB check
        try:
            self._ddb.Table(self._t_datasets).load()
            details["dynamodb"] = "ok"
            details["dynamodb_table"] = self._t_datasets
        except Exception as exc:
            details["dynamodb"] = f"error: {exc}"
            healthy = False

        # S3 check
        if self._bucket:
            try:
                self._s3.head_bucket(Bucket=self._bucket)
                details["s3"] = "ok"
                details["s3_bucket"] = self._bucket
            except Exception as exc:
                details["s3"] = f"error: {exc}"
                # S3 failure is non-fatal — memory still works via DynamoDB
        else:
            details["s3"] = "not configured (set S3_BUCKET to enable)"

        # Bedrock check
        if self._bedrock and settings.bedrock_model_id:
            details["bedrock"] = "configured"
            details["bedrock_model"] = settings.bedrock_model_id
        else:
            details["bedrock"] = "not configured — using keyword recall (free mode)"

        datasets = await self.list_datasets()
        details["datasets"] = len(datasets)

        return HealthStatus(
            healthy=healthy,
            backend=self.backend_name,
            message="ok" if healthy else "one or more services unavailable",
            details=details,
        )

    # ------------------------------------------------------------------ #
    # Internal helpers                                                   #
    # ------------------------------------------------------------------ #
    def _build_graph(
        self,
        dataset_id: str,
        name: str,
        content: str,
        created_at: str,
    ) -> tuple[set[str], set[str]]:
        """Build graph nodes + edges in-process and persist to DynamoDB."""
        size = len(content.encode("utf-8"))
        node_ids: set[str] = set()
        edge_ids: set[str] = set()

        # Source (root) node
        src = GraphNode(
            id=dataset_id,
            label="Note",
            name=name,
            properties={"created_at": created_at, "size": size},
        )
        self._nodes_cache[src.id] = src
        node_ids.add(src.id)
        self._put_node(dataset_id, src)

        # Extract and store concept nodes
        concepts = _extract_concepts(content)
        seen_concept_ids: set[str] = set()

        for concept in sorted(concepts):
            key = concept.lower()
            cid = self._concept_index.get(key)
            if cid is None:
                cid = uuid.uuid4().hex
                node = GraphNode(id=cid, label="Concept", name=concept)
                self._nodes_cache[cid] = node
                self._concept_index[key] = cid
                self._put_node(dataset_id, node)
            node_ids.add(cid)
            seen_concept_ids.add(cid)

            eid = f"{src.id}->MENTIONS->{cid}"
            if eid not in self._edges_cache:
                edge = GraphEdge(source=src.id, target=cid, label="MENTIONS")
                self._edges_cache[eid] = edge
                self._put_edge(dataset_id, eid, edge)
            edge_ids.add(eid)

        # RELATED_TO edges between co-occurring concepts
        cids = list(seen_concept_ids)
        for i in range(len(cids)):
            for j in range(i + 1, len(cids)):
                eid = f"{cids[i]}->RELATED_TO->{cids[j]}"
                if eid not in self._edges_cache:
                    edge = GraphEdge(source=cids[i], target=cids[j], label="RELATED_TO")
                    self._edges_cache[eid] = edge
                    self._put_edge(dataset_id, eid, edge)
                edge_ids.add(eid)

        return node_ids, edge_ids

    def _put_node(self, dataset_id: str, node: GraphNode) -> None:
        try:
            self._ddb.Table(self._t_nodes).put_item(Item=_to_ddb({
                "dataset_id": dataset_id,
                "node_id": node.id,
                "label": node.label,
                "name": node.name,
                "properties": node.properties,
            }))
        except Exception as exc:
            logger.warning("DynamoDB put_node failed: %s", exc)

    def _put_edge(self, dataset_id: str, eid: str, edge: GraphEdge) -> None:
        try:
            self._ddb.Table(self._t_edges).put_item(Item=_to_ddb({
                "dataset_id": dataset_id,
                "edge_id": eid,
                "source": edge.source,
                "target": edge.target,
                "label": edge.label,
                "properties": edge.properties,
            }))
        except Exception as exc:
            logger.warning("DynamoDB put_edge failed: %s", exc)

    def _delete_node_from_ddb(self, node_id: str) -> None:
        """Best-effort delete of a node across all dataset partitions."""
        try:
            table = self._ddb.Table(self._t_nodes)
            resp = table.scan(FilterExpression="node_id = :nid", ExpressionAttributeValues={":nid": node_id})
            for item in resp.get("Items", []):
                table.delete_item(Key={"dataset_id": item["dataset_id"], "node_id": node_id})
        except Exception as exc:
            logger.warning("DynamoDB delete_node failed: %s", exc)

    def _fetch_s3_content(self, dataset_id: str) -> str:
        if not self._bucket:
            return ""
        try:
            resp = self._s3.get_object(
                Bucket=self._bucket,
                Key=f"datasets/{dataset_id}/raw.txt",
            )
            return resp["Body"].read().decode("utf-8")
        except Exception:
            return ""

    def _node_in_scope(self, node_id: str, scope_ids: set[str]) -> bool:
        """Check if a node belongs to any dataset in scope."""
        try:
            table = self._ddb.Table(self._t_nodes)
            resp = table.scan(
                FilterExpression="node_id = :nid",
                ExpressionAttributeValues={":nid": node_id},
            )
            for item in resp.get("Items", []):
                if item.get("dataset_id") in scope_ids:
                    return True
        except Exception:
            pass
        return False

    def _node_owner(self, node_id: str) -> str | None:
        """Return the dataset_id that owns this node (first match)."""
        try:
            table = self._ddb.Table(self._t_nodes)
            resp = table.scan(
                FilterExpression="node_id = :nid",
                ExpressionAttributeValues={":nid": node_id},
            )
            for item in resp.get("Items", []):
                return item.get("dataset_id")
        except Exception:
            pass
        return None

    def _bedrock_synthesize(self, query: str, context: str) -> str:
        """Call Bedrock Claude to synthesize an answer from retrieved context."""
        if not self._bedrock:
            return ""
        model_id = settings.bedrock_model_id
        prompt = (
            f"You are AEGIS, an AI research memory assistant. "
            f"Answer the researcher's question using ONLY the context provided below. "
            f"Be concise and cite specific details from the context.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query}\n\n"
            f"Answer:"
        )
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            })
            resp = self._bedrock.invoke_model(
                modelId=model_id,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            result = json.loads(resp["body"].read())
            # Claude response schema: content[0].text
            content = result.get("content", [])
            if content and isinstance(content, list):
                return content[0].get("text", "")
            return result.get("completion", "")
        except Exception as exc:
            logger.warning("Bedrock InvokeModel failed: %s", exc)
            return f"(Bedrock error: {exc}) Context: {context[:240]}"

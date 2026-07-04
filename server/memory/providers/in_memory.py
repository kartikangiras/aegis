"""In-process memory provider.

A dependency-free implementation of the full Cognee memory lifecycle
(`remember / recall / improve / forget`) that runs entirely in memory.

It exists so that:

* The API layer can be exercised end-to-end in tests without Neo4j,
  Qdrant or an LLM API key.
* Local development works before the Docker stores are brought up.

It is NOT a replacement for Cognee in production — it performs naive
keyword + case-sensitive concept extraction and a graph that is good
enough to drive the Dashboard and Graph Explorer, not real semantic
reasoning.
"""

from __future__ import annotations

import re
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any

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

# Naive concept detector: sequences of Capitalized words, or explicit
# keywords a researcher is likely to care about. Good enough for a demo
# memory graph and for making ``improve()`` observable.
_CAPConcept = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b")
_CODE_CONCEPT = re.compile(r"\b(transformer|attention|agent|rag|embeddings?|"
                           r"llm|memory|graph|benchmark|dataset|"
                           r"ontology|knowledge graph|self-attention)\b", re.I)
_STOP = {"The", "This", "That", "These", "Those", "We", "They", "It",
         "An", "A", "In", "On", "And", "Or", "But", "For", "To", "Of",
         "Is", "Are", "Was", "Were", "Be", "Been", "Has", "Have"}


def _now() -> str:
    return datetime.now(UTC).isoformat()


class _Dataset:
    __slots__ = ("id", "name", "created_at", "raw", "chunks", "node_ids", "edge_ids", "size")

    def __init__(self, name: str, raw: str):
        self.id = uuid.uuid4().hex
        self.name = name
        self.created_at = _now()
        self.raw = raw
        self.size = len(raw.encode("utf-8"))
        self.chunks: list[str] = [raw]
        self.node_ids: set[str] = set()
        self.edge_ids: set[str] = set()


class InMemoryProvider(MemoryProvider):
    """Pure-Python memory lifecycle implementation."""

    backend_name = "memory"

    def __init__(self) -> None:
        self._datasets: dict[str, _Dataset] = {}
        self._nodes: dict[str, GraphNode] = {}
        self._edges: dict[str, GraphEdge] = {}
        # Simple concept -> node_id index for ``improve()`` dedupe.
        self._concept_index: dict[str, str] = {}

    # ---- Lifecycle --------------------------------------------------------
    async def remember(self, content: str, *, dataset_name: str | None = None) -> str:
        name = dataset_name or f"dataset_{len(self._datasets) + 1}"
        ds = _Dataset(name, content)
        self._datasets[ds.id] = ds
        self._build_graph(ds)
        return ds.id

    async def recall(self, query: str, *, dataset_id: str | None = None) -> RecallResult:
        query_terms = {w.lower() for w in re.findall(r"\w+", query) if len(w) > 2}
        if not query_terms:
            return RecallResult(answer="")

        dataset_ids = [dataset_id] if dataset_id else list(self._datasets)
        best_chunk = ""
        best_score = 0.0
        evidence: list[EvidenceItem] = []

        for did in dataset_ids:
            ds = self._datasets.get(did)
            if not ds:
                continue
            for i, chunk in enumerate(ds.chunks):
                chunk_terms = Counter(w.lower() for w in re.findall(r"\w+", chunk))
                score = sum(chunk_terms[t] for t in query_terms)
                if score > best_score:
                    best_score = score
                    best_chunk = chunk
                if score > 0:
                    evidence.append(
                        EvidenceItem(
                            text=chunk[:300],
                            source=ds.name,
                            node_id=did,
                            score=float(score),
                            metadata={"chunk": i},
                        )
                    )

        evidence.sort(key=lambda e: e.score, reverse=True)
        evidence = evidence[:5]

        if not best_chunk:
            return RecallResult(
                answer="I don't have any memory relevant to that question yet.",
                dataset_id=dataset_id,
            )

        answer = (
            f"Based on memory from {len(dataset_ids)} dataset(s), the most relevant "
            f"content mentions: {best_chunk[:240]}..."
        )
        return RecallResult(
            answer=answer, evidence=evidence, dataset_id=dataset_id,
        )

    async def improve(self, *, dataset_id: str | None = None) -> dict[str, Any]:
        dataset_ids = [dataset_id] if dataset_id else list(self._datasets)
        merged = 0
        new_edges = 0

        # Merge duplicate concept nodes (same name, different case) across scope.
        seen: dict[str, str] = {}
        to_remove: list[str] = []
        for nid, node in list(self._nodes.items()):
            if node.label != "Concept":
                continue
            owner_ds = self._owner_of_node(nid)
            if owner_ds not in dataset_ids:
                continue
            key = node.name.lower()
            if key in seen:
                canonical = seen[key]
                # Rewire edges pointing at the duplicate to the canonical node.
                for _eid, edge in list(self._edges.items()):
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
            self._nodes.pop(nid, None)
            self._remove_node_from_datasets(nid)
        merged = len(to_remove)

        # Create RELATED_TO edges between concepts that appear in the same dataset.
        concepts_by_ds: dict[str, list[str]] = defaultdict(list)
        for nid, node in self._nodes.items():
            if node.label == "Concept":
                owner = self._owner_of_node(nid)
                if owner in dataset_ids:
                    concepts_by_ds[owner].append(nid)
        for ds_id, nids in concepts_by_ds.items():
            for i in range(len(nids)):
                for j in range(i + 1, len(nids)):
                    eid = f"{nids[i]}->RELATED_TO->{nids[j]}"
                    if eid not in self._edges:
                        self._edges[eid] = GraphEdge(
                            source=nids[i], target=nids[j], label="RELATED_TO"
                        )
                        self._datasets[ds_id].edge_ids.add(eid)
                        new_edges += 1

        return {
            "merged_duplicates": merged,
            "new_relationships": new_edges,
            "concepts_after": sum(
                1 for n in self._nodes.values() if n.label == "Concept"
            ),
        }

    async def forget(self, dataset_id: str) -> dict[str, Any]:
        ds = self._datasets.pop(dataset_id, None)
        if not ds:
            return {"deleted": False, "dataset_id": dataset_id, "message": "not found"}
        for nid in list(ds.node_ids):
            self._nodes.pop(nid, None)
            self._concept_index = {k: v for k, v in self._concept_index.items() if v != nid}
        for eid in list(ds.edge_ids):
            self._edges.pop(eid, None)
        return {"deleted": True, "dataset_id": dataset_id, "name": ds.name}

    # ---- Dataset management ----------------------------------------------
    async def list_datasets(self) -> list[DatasetInfo]:
        return [
            DatasetInfo(
                id=ds.id,
                name=ds.name,
                created_at=ds.created_at,
                node_count=len(ds.node_ids),
                raw_size_bytes=ds.size,
            )
            for ds in self._datasets.values()
        ]

    # ---- Graph + stats ---------------------------------------------------
    async def get_graph(self, *, dataset_id: str | None = None) -> GraphData:
        node_ids: set[str] | None = None
        if dataset_id:
            node_ids = set(self._datasets[dataset_id].node_ids) if dataset_id in self._datasets else set()
        nodes = [n for n in self._nodes.values() if node_ids is None or n.id in node_ids]
        node_id_set = {n.id for n in nodes}
        edges = [
            e for e in self._edges.values()
            if e.source in node_id_set and e.target in node_id_set
        ]
        return GraphData(nodes=nodes, edges=edges)

    async def get_stats(self) -> GraphStats:
        node_type_counts: dict[str, int] = Counter(n.label for n in self._nodes.values())
        edge_type_counts: dict[str, int] = Counter(e.label for e in self._edges.values())
        nodes = len(self._nodes)
        edges = len(self._edges)
        datasets = len(self._datasets)
        # Quality heuristic: density (edges / possible) capped at 1, scaled by coverage.
        max_edges = max(nodes * (nodes - 1), 1)
        density = min(edges / max_edges, 1.0) if nodes > 1 else 0.0
        coverage = min(datasets / 5.0, 1.0)
        quality = round(0.6 * density + 0.4 * coverage, 3)
        return GraphStats(
            node_count=nodes,
            edge_count=edges,
            node_type_counts=dict(node_type_counts),
            edge_type_counts=dict(edge_type_counts),
            dataset_count=datasets,
            memory_quality_score=quality,
        )

    # ---- Health ----------------------------------------------------------
    async def health(self) -> HealthStatus:
        return HealthStatus(
            healthy=True,
            backend=self.backend_name,
            message="ok",
            details={"datasets": len(self._datasets), "nodes": len(self._nodes)},
        )

    # ---- Internal helpers ------------------------------------------------
    def _build_graph(self, ds: _Dataset) -> None:
        text = ds.raw
        src_node = GraphNode(
            id=ds.id, label="Note", name=ds.name,
            properties={"created_at": ds.created_at, "size": ds.size},
        )
        self._nodes[src_node.id] = src_node
        ds.node_ids.add(src_node.id)

        seen_concepts: set[str] = set()
        concepts = {m.group(0) for m in _CAPConcept.finditer(text)} | {
            m.group(0).title() for m in _CODE_CONCEPT.finditer(text)
        }
        concepts = {c for c in concepts if c not in _STOP and len(c) > 2}

        for concept in sorted(concepts):
            key = concept.lower()
            cid = self._concept_index.get(key)
            if cid is None:
                cid = uuid.uuid4().hex
                node = GraphNode(id=cid, label="Concept", name=concept)
                self._nodes[cid] = node
                self._concept_index[key] = cid
            ds.node_ids.add(cid)
            eid = f"{src_node.id}->MENTIONS->{cid}"
            self._edges[eid] = GraphEdge(source=src_node.id, target=cid, label="MENTIONS")
            ds.edge_ids.add(eid)
            seen_concepts.add(cid)

        # Connect concepts co-occurring in this dataset with RELATED_TO.
        cids = list(seen_concepts)
        for i in range(len(cids)):
            for j in range(i + 1, len(cids)):
                eid = f"{cids[i]}->RELATED_TO->{cids[j]}"
                if eid not in self._edges:
                    self._edges[eid] = GraphEdge(source=cids[i], target=cids[j], label="RELATED_TO")
                    ds.edge_ids.add(eid)

    def _owner_of_node(self, node_id: str) -> str | None:
        for ds in self._datasets.values():
            if node_id in ds.node_ids:
                return ds.id
        return None

    def _remove_node_from_datasets(self, node_id: str) -> None:
        for ds in self._datasets.values():
            ds.node_ids.discard(node_id)

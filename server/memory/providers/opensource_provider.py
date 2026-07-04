"""Open Source Cognee memory provider.

Production backend. Wraps the Cognee OSS library and its full memory
lifecycle (``remember / recall / improve / forget``) behind the
``MemoryProvider`` interface so the API layer never imports Cognee
directly.

Cognee is imported lazily so that the rest of the application (and the
test suite) imports cleanly even when Cognee or its infrastructure is
absent.

Configuration is applied once on first use via ``cognee.config.set_*``.
The provider works with the default Cognee backends (SQLite +
NetworkX/FalkorDB + local vector) as well as the Docker-provided
Neo4j + Qdrant stores configured through ``.env``.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings
from memory.base import (
    DatasetInfo,
    EvidenceItem,
    GraphData,
    GraphStats,
    HealthStatus,
    MemoryProvider,
    RecallResult,
)

logger = logging.getLogger("aegis.providers.cognee")


def _parse_model(model: str) -> tuple[str, str]:
    """Split ``openai/gpt-4o-mini`` into (provider, model_name)."""
    if "/" in model:
        provider, name = model.split("/", 1)
    else:
        provider, name = "openai", model
    return provider, name


class OpenSourceCogneeProvider(MemoryProvider):
    """Memory provider backed by the open source Cognee library."""

    backend_name = "opensource"
    _configured = False

    # ------------------------------------------------------------------ #
    # Configuration                                                      #
    # ------------------------------------------------------------------ #
    def _ensure_configured(self) -> None:
        if OpenSourceCogneeProvider._configured:
            return
        import cognee  # lazy

        cfg = cognee.config

        # LLM / embeddings.
        llm_provider, llm_name = _parse_model(settings.llm_model)
        emb_provider, emb_name = _parse_model(settings.embedding_model)

        if settings.llm_api_key:
            cfg.set_llm_api_key(settings.llm_api_key)
        cfg.set_llm_provider(llm_provider)
        cfg.set_llm_model(llm_name)
        cfg.set_embedding_provider(emb_provider)
        cfg.set_embedding_model(emb_name)
        if settings.llm_api_key:
            cfg.set_embedding_api_key(settings.llm_api_key)

        # Vector store (Qdrant) when configured.
        if settings.qdrant_url:
            cfg.set_vector_db_provider("Qdrant")
            cfg.set_vector_db_url(settings.qdrant_url)
            if settings.qdrant_api_key:
                cfg.set_vector_db_key(settings.qdrant_api_key)

        # Graph store (Neo4j) when configured.
        if settings.neo4j_uri:
            try:
                cfg.set_graph_database_provider("Neo4j")
                cfg.set_graph_db_config({
                    "graph_database_url": settings.neo4j_uri,
                    "graph_database_username": settings.neo4j_user,
                    "graph_database_password": settings.neo4j_password,
                })
            except Exception as exc:  # pragma: no cover - depends on cognee version
                logger.warning("Could not configure Neo4j graph provider: %s", exc)

        OpenSourceCogneeProvider._configured = True
        logger.info("Cognee configured (llm=%s, embedding=%s)",
                    settings.llm_model, settings.embedding_model)

    # ------------------------------------------------------------------ #
    # Lifecycle                                                         #
    # ------------------------------------------------------------------ #
    async def remember(self, content: str, *, dataset_name: str | None = None) -> str:
        self._ensure_configured()
        import cognee

        name = dataset_name or f"dataset_{abs(hash(content)) % 10_000}"
        await cognee.remember(content, dataset_name=name)
        # Resolve the dataset id Cognee created (best-effort).
        datasets = await self._safe_list_datasets()
        for ds in datasets:
            if getattr(ds, "name", None) == name:
                return str(getattr(ds, "id", name))
        return name

    async def recall(self, query: str, *, dataset_id: str | None = None) -> RecallResult:
        self._ensure_configured()
        import cognee

        kwargs: dict[str, Any] = {"top_k": 15}
        if dataset_id:
            # Cognee accepts dataset names or ids; pass through whichever we have.
            kwargs["datasets"] = [dataset_id]

        try:
            results = await cognee.recall(query, **kwargs)
        except Exception as exc:
            logger.warning("recall() failed: %s", exc)
            return RecallResult(answer=f"Recall failed: {exc}", dataset_id=dataset_id)

        return self._adapt_recall(results, dataset_id)

    async def improve(self, *, dataset_id: str | None = None) -> dict[str, Any]:
        self._ensure_configured()
        import cognee

        target = dataset_id or "main_dataset"
        try:
            result = await cognee.improve(target)
            return {"dataset": target, "result": self._to_plain(result)}
        except Exception as exc:
            return {"dataset": target, "error": str(exc)}

    async def forget(self, dataset_id: str) -> dict[str, Any]:
        self._ensure_configured()
        import cognee

        try:
            result = await cognee.forget(dataset=dataset_id)
            return self._to_plain(result)
        except Exception as exc:
            return {"deleted": False, "dataset_id": dataset_id, "error": str(exc)}

    # ------------------------------------------------------------------ #
    # Dataset management                                                #
    # ------------------------------------------------------------------ #
    async def list_datasets(self) -> list[DatasetInfo]:
        raw = await self._safe_list_datasets()
        out: list[DatasetInfo] = []
        for ds in raw:
            out.append(DatasetInfo(
                id=str(getattr(ds, "id", "")),
                name=getattr(ds, "name", "") or "",
                created_at=str(getattr(ds, "created_at", "") or "") or None,
                node_count=int(getattr(ds, "node_count", 0) or 0),
                raw_size_bytes=int(getattr(ds, "raw_size_bytes", 0) or 0),
            ))
        return out

    async def _safe_list_datasets(self) -> list[Any]:
        self._ensure_configured()
        import cognee
        try:
            return await cognee.datasets.list_datasets()
        except Exception as exc:
            logger.warning("list_datasets failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Graph + stats (best effort)                                       #
    # ------------------------------------------------------------------ #
    async def get_graph(self, *, dataset_id: str | None = None) -> GraphData:
        # The Cognee Python API does not expose a stable graph snapshot
        # across versions. The frontend Graph Explorer is fed from the
        # InMemory backend in tests; the production UI uses Cognee's own
        # visualization server (see cognee.visualize_graph) or the Neo4j
        # browser directly. Returning an empty graph keeps the API honest.
        return GraphData()

    async def get_stats(self) -> GraphStats:
        datasets = await self.list_datasets()
        return GraphStats(dataset_count=len(datasets))

    # ------------------------------------------------------------------ #
    # Health                                                             #
    # ------------------------------------------------------------------ #
    async def health(self) -> HealthStatus:
        self._ensure_configured()
        import cognee
        try:
            datasets = await cognee.datasets.list_datasets()
            return HealthStatus(
                healthy=True,
                backend=self.backend_name,
                message="ok",
                details={"datasets": len(datasets)},
            )
        except Exception as exc:
            return HealthStatus(
                healthy=False,
                backend=self.backend_name,
                message=str(exc),
            )

    # ------------------------------------------------------------------ #
    # Helpers                                                            #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _adapt_recall(results: Any, dataset_id: str | None) -> RecallResult:
        """Map Cognee's recall response (varies by version) to RecallResult."""
        if results is None:
            return RecallResult(answer="", dataset_id=dataset_id)

        items = results if isinstance(results, list) else [results]
        answer_parts: list[str] = []
        evidence: list[EvidenceItem] = []

        for item in items:
            dump = OpenSourceCogneeProvider._to_plain(item)
            text = (
                dump.get("answer")
                or dump.get("response")
                or dump.get("content")
                or dump.get("text")
                or ""
            )
            if text:
                answer_parts.append(str(text))
            src = dump.get("source") or dump.get("dataset_name") or ""
            evidence.append(EvidenceItem(
                text=str(text or dump)[:500],
                source=str(src),
                node_id=str(dump.get("id", "")),
                score=float(dump.get("score", 0.0) or 0.0),
                metadata=dump,
            ))

        answer = "\n\n".join(answer_parts) if answer_parts else ""
        return RecallResult(answer=answer, evidence=evidence, dataset_id=dataset_id, raw=results)

    @staticmethod
    def _to_plain(obj: Any) -> Any:
        """Best-effort conversion of a cognee result object to plain data."""
        if obj is None:
            return None
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, list):
            return [OpenSourceCogneeProvider._to_plain(x) for x in obj]
        if isinstance(obj, dict):
            return {k: OpenSourceCogneeProvider._to_plain(v) for k, v in obj.items()}
        if hasattr(obj, "model_dump"):  # pydantic v2
            try:
                return obj.model_dump()
            except Exception:
                pass
        if hasattr(obj, "__dict__"):
            return {
                k: OpenSourceCogneeProvider._to_plain(v)
                for k, v in obj.__dict__.items()
                if not k.startswith("_")
            }
        return str(obj)

"""Memory provider abstraction.

This is the spec's central requirement: *"Aegis must never directly depend on
Cognee implementation details."* Every backend implements this interface, and
the API layer talks **only** to `MemoryProvider` — never to Cognee directly.

The Cognee library is imported lazily *inside* concrete providers, so this
module (and the entire API) imports cleanly even when Cognee is not installed.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DatasetInfo:
    """A stored memory dataset (one ingested source = one dataset)."""

    id: str
    name: str
    created_at: str | None = None
    node_count: int = 0
    raw_size_bytes: int = 0


@dataclass
class EvidenceItem:
    """A piece of retrieved evidence backing a recall answer."""

    text: str
    source: str = ""
    node_id: str = ""
    score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RecallResult:
    """The result of a recall() call — answer plus supporting evidence."""

    answer: str
    evidence: list[EvidenceItem] = field(default_factory=list)
    dataset_id: str | None = None
    raw: Any = None  # provider-specific raw payload


@dataclass
class GraphNode:
    id: str
    label: str            # node "type": Paper, Concept, Author, ...
    name: str             # human-readable title
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    source: str
    target: str
    label: str            # relationship: AUTHORED_BY, USES, ...
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphData:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)


@dataclass
class GraphStats:
    node_count: int = 0
    edge_count: int = 0
    node_type_counts: dict[str, int] = field(default_factory=dict)
    edge_type_counts: dict[str, int] = field(default_factory=dict)
    dataset_count: int = 0
    # Memory quality score 0..1 (heuristic: density + coverage)
    memory_quality_score: float = 0.0


@dataclass
class HealthStatus:
    healthy: bool
    backend: str
    message: str = "ok"
    details: dict[str, Any] = field(default_factory=dict)


class MemoryProvider(ABC):
    """The memory lifecycle interface every backend must implement.

    Operations map 1:1 to the Cognee memory lifecycle and the spec's
    "MEMORY PROVIDER INTERFACE" section.
    """

    backend_name: str = "abstract"

    # ---- Lifecycle --------------------------------------------------------
    @abstractmethod
    async def remember(self, content: str, *, dataset_name: str | None = None) -> str:
        """Ingest content into memory and process it into the graph.

        Returns the dataset_id that was written.
        """

    @abstractmethod
    async def recall(self, query: str, *, dataset_id: str | None = None) -> RecallResult:
        """Query memory via graph + vector search and synthesize an answer."""

    @abstractmethod
    async def improve(self, *, dataset_id: str | None = None) -> dict[str, Any]:
        """Self-optimize memory: merge duplicates, strengthen relationships,
        build ontology. Returns a summary of changes."""

    @abstractmethod
    async def forget(self, dataset_id: str) -> dict[str, Any]:
        """Controlled deletion of a dataset and its associated graph nodes."""

    # ---- Dataset management ----------------------------------------------
    @abstractmethod
    async def list_datasets(self) -> list[DatasetInfo]:
        """List all stored memory datasets."""

    # ---- Graph + stats (for the frontend Graph Explorer / Dashboard) ------
    async def get_graph(self, *, dataset_id: str | None = None) -> GraphData:
        """Return nodes + edges for visualization. Optional override."""
        return GraphData()

    async def get_stats(self) -> GraphStats:
        """Return aggregate statistics. Optional override."""
        return GraphStats()

    # ---- Health -----------------------------------------------------------
    @abstractmethod
    async def health(self) -> HealthStatus:
        """Report backend health."""

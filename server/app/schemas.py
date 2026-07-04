"""Pydantic request/response schemas for the API layer.

These models are deliberately small and independent of the provider
dataclasses so the public contract is stable even if the memory backend
implementation changes.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    message: str
    dataset_id: str | None = None


class RememberTextRequest(BaseModel):
    content: str = Field(..., min_length=1)
    dataset_name: str | None = None
    source_type: str = "text"


class RecallRequest(BaseModel):
    query: str = Field(..., min_length=1)
    dataset_id: str | None = None


class ImproveRequest(BaseModel):
    dataset_id: str | None = None


class ForgetRequest(BaseModel):
    dataset_id: str = Field(..., min_length=1)


class EvidenceOut(BaseModel):
    text: str
    source: str = ""
    node_id: str = ""
    score: float = 0.0
    metadata: dict[str, Any] = {}

    model_config = {"from_attributes": True}


class RecallResponse(BaseModel):
    answer: str
    evidence: list[EvidenceOut] = []
    dataset_id: str | None = None


class DatasetOut(BaseModel):
    id: str
    name: str
    created_at: str | None = None
    node_count: int = 0
    raw_size_bytes: int = 0

    model_config = {"from_attributes": True}


class GraphNodeOut(BaseModel):
    id: str
    label: str
    name: str
    properties: dict[str, Any] = {}

    model_config = {"from_attributes": True}


class GraphEdgeOut(BaseModel):
    source: str
    target: str
    label: str
    properties: dict[str, Any] = {}

    model_config = {"from_attributes": True}


class GraphDataOut(BaseModel):
    nodes: list[GraphNodeOut] = []
    edges: list[GraphEdgeOut] = []


class GraphStatsOut(BaseModel):
    node_count: int = 0
    edge_count: int = 0
    node_type_counts: dict[str, int] = {}
    edge_type_counts: dict[str, int] = {}
    dataset_count: int = 0
    memory_quality_score: float = 0.0

    model_config = {"from_attributes": True}


class HealthOut(BaseModel):
    healthy: bool
    backend: str
    message: str = "ok"
    details: dict[str, Any] = {}

    model_config = {"from_attributes": True}

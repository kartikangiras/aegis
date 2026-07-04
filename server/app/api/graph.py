"""Graph visualization endpoint — feeds the frontend Graph Explorer."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import memory_provider
from app.schemas import GraphDataOut, GraphEdgeOut, GraphNodeOut
from memory.base import MemoryProvider

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("", response_model=GraphDataOut)
async def get_graph(
    dataset_id: str | None = Query(default=None),
    provider: MemoryProvider = Depends(memory_provider),
):
    data = await provider.get_graph(dataset_id=dataset_id)
    return GraphDataOut(
        nodes=[GraphNodeOut(**n.__dict__) for n in data.nodes],
        edges=[GraphEdgeOut(**e.__dict__) for e in data.edges],
    )

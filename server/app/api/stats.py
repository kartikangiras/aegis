"""Aggregate statistics — feeds the Dashboard modules."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import memory_provider
from app.schemas import GraphStatsOut
from memory.base import MemoryProvider

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=GraphStatsOut)
async def get_stats(provider: MemoryProvider = Depends(memory_provider)):
    stats = await provider.get_stats()
    return GraphStatsOut.model_validate(stats)

"""Health endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import memory_provider
from app.schemas import HealthOut
from memory.base import MemoryProvider

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthOut)
async def health(provider: MemoryProvider = Depends(memory_provider)) -> HealthOut:
    status = await provider.health()
    return HealthOut.model_validate(status)

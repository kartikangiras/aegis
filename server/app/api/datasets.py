"""Dataset management endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import memory_provider
from app.schemas import DatasetOut
from memory.base import MemoryProvider

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
async def list_datasets(provider: MemoryProvider = Depends(memory_provider)):
    return await provider.list_datasets()

"""Memory lifecycle endpoints — ``recall`` / ``improve`` / ``forget``."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from app.dependencies import memory_provider
from app.schemas import (
    ForgetRequest,
    ImproveRequest,
    MessageResponse,
    RecallRequest,
    RecallResponse,
)
from memory.base import MemoryProvider

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.post("/recall", response_model=RecallResponse)
async def recall(body: RecallRequest, provider: MemoryProvider = Depends(memory_provider)):
    try:
        result = await provider.recall(body.query, dataset_id=body.dataset_id)
    except Exception as exc:  # provider / store errors
        raise HTTPException(status_code=502, detail=f"recall() failed: {exc}") from exc
    return RecallResponse(
        answer=result.answer,
        evidence=[asdict(e) for e in result.evidence],
        dataset_id=result.dataset_id,
    )


@router.post("/improve", response_model=MessageResponse)
async def improve(
    body: ImproveRequest = Body(default=ImproveRequest()),
    provider: MemoryProvider = Depends(memory_provider),
):
    try:
        changes: dict[str, Any] = await provider.improve(dataset_id=body.dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"improve() failed: {exc}") from exc
    msg = "improved"
    if changes.get("merged_duplicates") is not None:
        msg = (
            f"merged {changes.get('merged_duplicates', 0)} duplicates, "
            f"added {changes.get('new_relationships', 0)} relationships"
        )
    return MessageResponse(message=msg)


@router.delete("/forget", response_model=MessageResponse)
async def forget(body: ForgetRequest, provider: MemoryProvider = Depends(memory_provider)):
    try:
        result = await provider.forget(body.dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"forget() failed: {exc}") from exc
    if not result.get("deleted", True):
        raise HTTPException(status_code=404, detail=result.get("message", "not found"))
    return MessageResponse(
        message="forgotten",
        dataset_id=body.dataset_id,
    )

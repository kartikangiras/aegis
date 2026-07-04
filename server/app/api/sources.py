"""Source ingestion — the ``remember`` half of the memory lifecycle.

Mirrors ``project.md`` → SUPPORTED INPUTS:
    POST /api/sources/text
    POST /api/sources/url
    POST /api/sources/pdf        (multipart upload)
    POST /api/sources/github
    POST /api/sources/youtube
    POST /api/sources/notes      (alias of text)

Each endpoint parses the source into plain text and hands it to
``provider.remember()``, returning the new dataset id.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.dependencies import memory_provider
from app.parsers import (
    parse_github,
    parse_pdf,
    parse_text,
    parse_url,
    parse_youtube,
)
from app.schemas import MessageResponse
from memory.base import MemoryProvider

router = APIRouter(prefix="/api/sources", tags=["sources"])


class TextIn(BaseModel):
    content: str
    dataset_name: str | None = None


class UrlIn(BaseModel):
    url: str
    dataset_name: str | None = None


class GithubIn(BaseModel):
    repo: str
    dataset_name: str | None = None


class YouTubeIn(BaseModel):
    url_or_id: str
    dataset_name: str | None = None


async def _remember(provider: MemoryProvider, text: str, name: str | None) -> MessageResponse:
    try:
        dataset_id = await provider.remember(text, dataset_name=name)
    except HTTPException:
        raise
    except Exception as exc:  # provider / store errors
        raise HTTPException(status_code=502, detail=f"remember() failed: {exc}") from exc
    return MessageResponse(message="remembered", dataset_id=dataset_id)


@router.post("/text", response_model=MessageResponse)
async def remember_text(body: TextIn, provider: MemoryProvider = Depends(memory_provider)):
    try:
        text = parse_text(body.content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, body.dataset_name)


@router.post("/notes", response_model=MessageResponse)
async def remember_notes(body: TextIn, provider: MemoryProvider = Depends(memory_provider)):
    try:
        text = parse_text(body.content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, body.dataset_name)


@router.post("/url", response_model=MessageResponse)
async def remember_url(body: UrlIn, provider: MemoryProvider = Depends(memory_provider)):
    try:
        text = parse_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, body.dataset_name or body.url)


@router.post("/pdf", response_model=MessageResponse)
async def remember_pdf(
    file: UploadFile = File(...),
    dataset_name: str | None = Form(default=None),
    provider: MemoryProvider = Depends(memory_provider),
):
    data = await file.read()
    try:
        text = parse_pdf(data, filename=file.filename or "upload.pdf")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, dataset_name or file.filename)


@router.post("/github", response_model=MessageResponse)
async def remember_github(body: GithubIn, provider: MemoryProvider = Depends(memory_provider)):
    try:
        text = parse_github(body.repo, token=settings.github_token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, body.dataset_name or body.repo)


@router.post("/youtube", response_model=MessageResponse)
async def remember_youtube(body: YouTubeIn, provider: MemoryProvider = Depends(memory_provider)):
    try:
        text = parse_youtube(body.url_or_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await _remember(provider, text, body.dataset_name or body.url_or_id)

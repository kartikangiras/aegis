"""AEGIS FastAPI application entrypoint.

Run locally:

    uv run uvicorn app.main:app --reload --port 8000

API docs: http://localhost:8000/docs
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import datasets, graph, health, memory, sources, stats
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=(
        "AEGIS — Memory Operating System for AI Research. "
        "Implements the complete Cognee memory lifecycle: "
        "remember / recall / improve / forget."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers ----------------------------------------------------------------
app.include_router(health.router)
app.include_router(sources.router)
app.include_router(memory.router)
app.include_router(datasets.router)
app.include_router(graph.router)
app.include_router(stats.router)


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "memory_backend": settings.memory_backend,
        "docs": "/docs",
    }

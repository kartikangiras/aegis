"""Shared test fixtures.

The backend's production path (``OpenSourceCogneeProvider``) requires
Neo4j + Qdrant + an LLM API key, none of which are available in CI. To
prove the backend wiring, lifecycle flow and API contract work, we inject
the dependency-free :class:`InMemoryProvider` via FastAPI's dependency
override. This exercises the *real* API layer, schemas and router logic
end-to-end without external services.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.dependencies import memory_provider
from app.main import app
from memory.providers.in_memory import InMemoryProvider


@pytest.fixture
def provider() -> InMemoryProvider:
    """A fresh in-memory provider per test for isolation."""
    return InMemoryProvider()


@pytest.fixture
def client(provider: InMemoryProvider) -> TestClient:
    """A TestClient wired to the in-memory provider."""

    async def _override():
        return provider

    app.dependency_overrides[memory_provider] = _override
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()

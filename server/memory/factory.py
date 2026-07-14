"""Memory provider factory.

Per ``project.md`` the application startup selects the backend:

    if backend == "opensource": provider = OpenSourceCogneeProvider()
    if backend == "aws":        provider = AWSProvider()

Business logic remains unchanged. New providers can be added without
changing business logic.

``get_memory_provider()`` is the single injection point used by the API
layer (``app/dependencies.py``). It caches the provider for the process
lifetime.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import settings
from memory.base import MemoryProvider


def _build_provider() -> MemoryProvider:
    backend = settings.memory_backend.lower()

    if backend == "memory":
        from memory.providers.in_memory import InMemoryProvider

        return InMemoryProvider()

    if backend == "opensource":
        from memory.providers.opensource_provider import OpenSourceCogneeProvider

        return OpenSourceCogneeProvider()

    if backend == "aws":
        from memory.providers.aws_provider import AWSProvider

        return AWSProvider()

    raise ValueError(
        f"Unknown MEMORY_BACKEND={backend!r}. Expected 'opensource', 'memory', or 'aws'."
    )


@lru_cache
def get_memory_provider() -> MemoryProvider:
    """Return the process-wide memory provider (selected from settings)."""
    return _build_provider()


def reset_memory_provider() -> None:
    """Clear the cached provider (used by tests after changing settings)."""
    get_memory_provider.cache_clear()

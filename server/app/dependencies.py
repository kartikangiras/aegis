"""FastAPI dependencies.

The single injection point for the memory backend. Routes depend on
``get_memory_provider`` and never on a concrete implementation, which is
what makes the backend swappable (see ``project.md`` → MEMORY BACKEND
ABSTRACTION).
"""

from __future__ import annotations

from memory.base import MemoryProvider
from memory.factory import get_memory_provider


async def memory_provider() -> MemoryProvider:
    """Return the process-wide memory provider.

    Wrapped as a dependency so tests can override it with
    ``app.dependency_overrides``.
    """
    return get_memory_provider()

"""Memory backend providers.

Concrete implementations of :class:`memory.base.MemoryProvider`.

- :class:`OpenSourceCogneeProvider` — production path, uses Cognee OSS +
  Neo4j + Qdrant.
- :class:`InMemoryProvider` — dependency-free in-process provider used for
  tests and local development without external infrastructure.

Cognee is imported lazily inside the opensource provider so the whole
package imports cleanly even when Cognee is not installed.
"""

from memory.base import MemoryProvider

__all__ = ["MemoryProvider"]

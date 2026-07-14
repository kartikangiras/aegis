"""Memory backend providers.

Concrete implementations of :class:`memory.base.MemoryProvider`.

- :class:`OpenSourceCogneeProvider` — production path, uses Cognee OSS +
  Neo4j + Qdrant.
- :class:`InMemoryProvider` — dependency-free in-process provider used for
  tests and local development without external infrastructure.
- :class:`AWSProvider` — zero-cost AWS backend using S3 (raw archival) +
  DynamoDB (persistent graph + dataset registry). Bedrock LLM synthesis
  is optional; keyword recall is used by default (free).

All providers are imported lazily inside the factory so this package
imports cleanly even when boto3 or Cognee are not installed.
"""

from memory.base import MemoryProvider

__all__ = ["MemoryProvider"]

"""Application configuration loaded from environment.

All settings are optional with sensible defaults so the app boots for smoke
tests even without a `.env` file. Real credentials are supplied at runtime.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Backend selection -------------------------------------------------
    # aws        -> Amazon S3 + DynamoDB (zero-cost, persistent — primary)
    # memory     -> in-process provider (dev/testing, no infra required)
    # opensource -> Cognee + Neo4j + Qdrant (legacy)
    memory_backend: Literal["opensource", "memory", "aws"] = "aws"

    # --- Shared LLM --------------------------------------------------------
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-4o-mini"
    embedding_model: str = "openai/text-embedding-3-small"

    # --- Open Source Cognee (Neo4j + Qdrant) ------------------------------
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "aegispassword"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # --- AWS (set MEMORY_BACKEND=aws to activate) -------------------------
    # Zero-cost stack: S3 (raw archival, free tier) + DynamoDB (graph +
    # dataset storage, always free). Bedrock is optional — leave blank to
    # use keyword recall at no cost.
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""  # for temporary/assumed-role credentials
    s3_bucket: str = ""          # globally unique; leave blank to skip S3
    dynamodb_table_prefix: str = "aegis"  # tables: aegis-datasets, aegis-nodes, aegis-edges
    # Bedrock (optional LLM upgrade — pay-per-token; leave blank for free keyword mode)
    bedrock_model_id: str = ""   # e.g. anthropic.claude-3-haiku-20240307-v1:0
    bedrock_embedding_model_id: str = ""  # e.g. amazon.titan-embed-text-v2:0
    # Not used in zero-cost plan (kept for future reference)
    neptune_endpoint: str = ""
    opensearch_endpoint: str = ""

    # --- Ingestion helpers -------------------------------------------------
    github_token: str = ""

    # --- API ---------------------------------------------------------------
    api_title: str = "AEGIS — Context Memory AI"
    api_version: str = "3.0.0"
    cors_origins: str = "http://localhost:3000"

    @computed_field  # type: ignore[misc]
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @computed_field  # type: ignore[misc]
    @property
    def qdrant_host(self) -> str:
        """Host parsed from QDRANT_URL (used by the legacy Cognee provider)."""
        url = self.qdrant_url.replace("http://", "").replace("https://", "")
        return url.split(":")[0]

    @computed_field  # type: ignore[misc]
    @property
    def qdrant_port(self) -> int:
        """Port parsed from QDRANT_URL."""
        url = self.qdrant_url.replace("http://", "").replace("https://", "")
        parts = url.split(":")
        return int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 6333


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


settings = get_settings()

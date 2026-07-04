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
    # opensource -> Open Source Cognee + Neo4j + Qdrant  (hackathon primary)
    # memory     -> in-process provider (testing / local dev without infra)
    memory_backend: Literal["opensource", "memory"] = "opensource"

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

    # --- AWS (future scope, see project.md FUTURE SCOPE section) -----------
    # Placeholder — an AWSProvider (Bedrock + Neptune + OpenSearch) is planned
    # but not yet implemented. These are read now so configuration is ready.
    aws_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    bedrock_model_id: str = ""
    neptune_endpoint: str = ""
    opensearch_endpoint: str = ""
    s3_bucket: str = ""

    # --- Ingestion helpers -------------------------------------------------
    github_token: str = ""

    # --- API ---------------------------------------------------------------
    api_title: str = "AEGIS — Memory Operating System"
    api_version: str = "3.0.0"
    cors_origins: str = "http://localhost:3000"

    @computed_field  # type: ignore[misc]
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @computed_field  # type: ignore[misc]
    @property
    def qdrant_host(self) -> str:
        """Host parsed from QDRANT_URL (Cognee expects host + port separately)."""
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

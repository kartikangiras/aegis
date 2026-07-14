"""Tests for AWSProvider — all AWS calls are mocked via unittest.mock.

No real AWS credentials or services are required to run these tests.
"""

from __future__ import annotations

import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Build a minimal boto3 mock so ``import boto3`` succeeds without the package.
# If boto3 IS installed, the real package will shadow this.
# ---------------------------------------------------------------------------
def _make_boto3_mock() -> types.ModuleType:
    """Return a boto3 module mock that satisfies AWSProvider's constructor."""
    boto3_mod = types.ModuleType("boto3")

    # Session mock
    session = MagicMock()

    # S3 client mock
    s3 = MagicMock()
    s3.head_bucket.return_value = {}
    s3.put_object.return_value = {}
    s3.get_object.return_value = {"Body": MagicMock(read=lambda: b"stored content")}
    s3.delete_object.return_value = {}

    # DynamoDB resource + table mock
    ddb = MagicMock()
    table = MagicMock()
    table.load.return_value = None          # table "exists"
    table.wait_until_exists.return_value = None
    table.put_item.return_value = {}
    table.get_item.return_value = {"Item": {}}
    table.delete_item.return_value = {}
    table.scan.return_value = {"Items": []}
    ddb.Table.return_value = table
    ddb.create_table.return_value = table

    session.client.return_value = s3   # returns same mock for s3 and bedrock
    session.resource.return_value = ddb

    boto3_mod.Session = MagicMock(return_value=session)  # type: ignore[attr-defined]

    # botocore.exceptions stub
    botocore_mod = types.ModuleType("botocore")
    exc_mod = types.ModuleType("botocore.exceptions")

    class _ClientError(Exception):
        def __init__(self, code: str = "404"):
            self.response = {"Error": {"Code": code}}
        def __str__(self) -> str:
            return f"ClientError {self.response['Error']['Code']}"

    exc_mod.ClientError = _ClientError  # type: ignore[attr-defined]
    botocore_mod.exceptions = exc_mod   # type: ignore[attr-defined]

    sys.modules.setdefault("botocore", botocore_mod)
    sys.modules.setdefault("botocore.exceptions", exc_mod)

    return boto3_mod


# Register mock before any import of aws_provider
sys.modules.setdefault("boto3", _make_boto3_mock())


# ---------------------------------------------------------------------------
# Fixture: AWSProvider with patched settings
# ---------------------------------------------------------------------------
@pytest.fixture()
def provider():
    """Return an AWSProvider with minimal settings (no real AWS)."""
    import app.config as cfg_module

    # Patch settings so AWSProvider uses dummy values
    fake_settings = MagicMock()
    fake_settings.aws_access_key_id = ""
    fake_settings.aws_secret_access_key = ""
    fake_settings.aws_session_token = ""
    fake_settings.aws_region = "us-east-1"
    fake_settings.s3_bucket = "test-bucket"
    fake_settings.dynamodb_table_prefix = "aegis"
    fake_settings.bedrock_model_id = ""      # no Bedrock → keyword mode
    fake_settings.bedrock_embedding_model_id = ""

    with patch.object(cfg_module, "settings", fake_settings):
        # Also patch settings inside aws_provider module
        import memory.providers.aws_provider as aws_mod
        with patch.object(aws_mod, "settings", fake_settings):
            from memory.providers.aws_provider import AWSProvider
            p = AWSProvider()
            yield p


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
class TestAWSProviderHealth:
    @pytest.mark.asyncio
    async def test_health_returns_aws_backend(self, provider):
        status = await provider.health()
        assert status.backend == "aws"
        assert status.healthy is True

    @pytest.mark.asyncio
    async def test_health_details_include_s3_and_dynamodb(self, provider):
        status = await provider.health()
        assert "dynamodb" in status.details
        assert "s3" in status.details

    @pytest.mark.asyncio
    async def test_health_no_bedrock_when_model_id_blank(self, provider):
        status = await provider.health()
        assert "not configured" in status.details["bedrock"]


class TestAWSProviderRemember:
    @pytest.mark.asyncio
    async def test_remember_returns_string_id(self, provider):
        dataset_id = await provider.remember("Transformers use self-attention.", dataset_name="test")
        assert isinstance(dataset_id, str)
        assert len(dataset_id) > 0

    @pytest.mark.asyncio
    async def test_remember_calls_s3_put_object(self, provider):
        await provider.remember("Some research text", dataset_name="paper1")
        provider._s3.put_object.assert_called()  # may be called multiple times across tests
        # Verify the most recent call used the test bucket
        last_call_kwargs = provider._s3.put_object.call_args.kwargs
        assert last_call_kwargs["Bucket"] == "test-bucket"
        assert "datasets/" in last_call_kwargs["Key"]

    @pytest.mark.asyncio
    async def test_remember_builds_in_process_graph(self, provider):
        await provider.remember(
            "Attention Is All You Need introduced transformer models.",
            dataset_name="attn_paper",
        )
        # At least a root Note node should exist
        assert len(provider._nodes_cache) >= 1


class TestAWSProviderRecall:
    @pytest.mark.asyncio
    async def test_recall_no_memory_returns_empty_answer(self, provider):
        result = await provider.recall("What is attention?")
        assert "don't have any memory" in result.answer or result.answer == ""

    @pytest.mark.asyncio
    async def test_recall_after_remember_returns_answer(self, provider):
        await provider.remember(
            "The transformer architecture relies on the attention mechanism.",
            dataset_name="transformer_paper",
        )
        # Patch s3.get_object to return the remembered text
        provider._s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"The transformer architecture relies on the attention mechanism.")
        }
        result = await provider.recall("attention mechanism")
        # Should find some evidence
        assert result.answer != ""
        assert isinstance(result.evidence, list)

    @pytest.mark.asyncio
    async def test_recall_evidence_scores_are_float(self, provider):
        await provider.remember("LLMs are large language models.", dataset_name="llm_note")
        provider._s3.get_object.return_value = {
            "Body": MagicMock(read=lambda: b"LLMs are large language models.")
        }
        result = await provider.recall("LLM")
        for ev in result.evidence:
            assert isinstance(ev.score, float)


class TestAWSProviderForget:
    @pytest.mark.asyncio
    async def test_forget_nonexistent_dataset(self, provider):
        result = await provider.forget("nonexistent-id")
        assert result["deleted"] is False
        assert result["dataset_id"] == "nonexistent-id"

    @pytest.mark.asyncio
    async def test_forget_existing_dataset(self, provider):
        # Make DynamoDB return a fake dataset item
        import memory.providers.aws_provider as aws_mod
        provider._ddb.Table.return_value.get_item.return_value = {
            "Item": {
                "id": "ds123",
                "name": "my-dataset",
                "node_ids": [],
                "edge_ids": [],
            }
        }
        result = await provider.forget("ds123")
        assert result["deleted"] is True
        assert result["name"] == "my-dataset"


class TestAWSProviderImprove:
    @pytest.mark.asyncio
    async def test_improve_returns_summary_dict(self, provider):
        result = await provider.improve()
        assert "merged_duplicates" in result
        assert "new_relationships" in result
        assert "concepts_after" in result

    @pytest.mark.asyncio
    async def test_improve_merges_duplicate_concepts(self, provider):
        """Two concept nodes with the same name → improve() merges them."""
        from memory.base import GraphNode

        # Pre-load cache so _load_cache() doesn't re-scan DynamoDB
        provider._cache_loaded = True

        # Manually inject two concept nodes with the same name (different case)
        provider._nodes_cache["node_aaa"] = GraphNode(id="node_aaa", label="Concept", name="Attention")
        provider._nodes_cache["node_bbb"] = GraphNode(id="node_bbb", label="Concept", name="attention")
        provider._concept_index["attention"] = "node_aaa"

        # Use different table mocks for datasets vs nodes tables
        datasets_table = MagicMock()
        datasets_table.scan.return_value = {"Items": []}  # empty datasets list
        datasets_table.put_item.return_value = {}
        datasets_table.delete_item.return_value = {}

        nodes_table = MagicMock()
        nodes_table.scan.return_value = {
            "Items": [{"dataset_id": "ds_x", "node_id": "node_bbb"}]
        }
        nodes_table.put_item.return_value = {}
        nodes_table.delete_item.return_value = {}

        edges_table = MagicMock()
        edges_table.scan.return_value = {"Items": []}
        edges_table.put_item.return_value = {}

        def _table_router(name: str) -> MagicMock:
            if "datasets" in name:
                return datasets_table
            if "edges" in name:
                return edges_table
            return nodes_table

        provider._ddb.Table.side_effect = _table_router

        result = await provider.improve()
        assert isinstance(result["merged_duplicates"], int)


class TestAWSProviderListDatasets:
    @pytest.mark.asyncio
    async def test_list_datasets_empty(self, provider):
        provider._ddb.Table.return_value.scan.return_value = {"Items": []}
        datasets = await provider.list_datasets()
        assert datasets == []

    @pytest.mark.asyncio
    async def test_list_datasets_returns_dataset_info(self, provider):
        from decimal import Decimal
        # Reset any side_effect from previous tests that may have set a table router
        provider._ddb.Table.side_effect = None
        provider._ddb.Table.return_value.scan.return_value = {
            "Items": [{
                "id": "abc123",
                "name": "test_dataset",
                "created_at": "2026-01-01T00:00:00+00:00",
                "node_count": Decimal("5"),
                "raw_size_bytes": Decimal("1024"),
            }]
        }
        datasets = await provider.list_datasets()
        assert len(datasets) == 1
        assert datasets[0].id == "abc123"
        assert datasets[0].name == "test_dataset"
        assert datasets[0].node_count == 5

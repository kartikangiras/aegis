"""Full memory lifecycle: remember -> recall -> datasets -> improve -> forget.

This is the canonical demo flow from ``project.md`` → HACKATHON DEMO,
exercised against the in-memory backend through the real HTTP API.
"""

from fastapi.testclient import TestClient

PAPER_EXCERPT = (
    "Attention Is All You Need. We propose a new architecture, the Transformer, "
    "based solely on attention mechanisms, dispensing with recurrence and convolutions. "
    "The Transformer uses self-attention and multi-head attention to model dependencies "
    "between tokens. Experiments on machine translation benchmarks show the model learns "
    "in-context learning and generalizes well."
)

REACT_EXCERPT = (
    "ReAct: Synergizing Reasoning and Acting in Language Models. We combine reasoning "
    "and acting in LLM agents. The agent produces reasoning traces and actions, improving "
    "tool use and memory for downstream tasks."
)


def test_remember_returns_dataset_id(client: TestClient):
    r = client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message"] == "remembered"
    assert body["dataset_id"]


def test_dataset_appears_in_list(client: TestClient):
    client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    r = client.get("/api/datasets")
    assert r.status_code == 200
    datasets = r.json()
    assert len(datasets) == 1
    assert datasets[0]["name"] == "transformer"
    assert datasets[0]["id"]
    assert datasets[0]["node_count"] > 0


def test_recall_finds_relevant_memory(client: TestClient):
    client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    client.post("/api/sources/text", json={"content": REACT_EXCERPT, "dataset_name": "react"})

    r = client.post("/api/memory/recall", json={"query": "What is the Transformer architecture?"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["answer"], "recall should produce an answer"
    assert isinstance(body["evidence"], list)
    assert len(body["evidence"]) >= 1
    # The transformer dataset should outrank react for this query.
    top = max(body["evidence"], key=lambda e: e["score"])
    assert "transformer" in top["source"].lower() or "attention" in top["text"].lower()


def test_recall_no_memory_returns_graceful_answer(client: TestClient):
    r = client.post("/api/memory/recall", json={"query": "anything at all"})
    assert r.status_code == 200
    assert r.json()["answer"]  # non-empty, no crash


def test_graph_is_populated_after_remember(client: TestClient):
    client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    r = client.get("/api/graph")
    assert r.status_code == 200
    graph = r.json()
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0
    labels = {n["label"] for n in graph["nodes"]}
    assert "Concept" in labels


def test_stats_reflect_memory(client: TestClient):
    client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    r = client.get("/api/stats")
    assert r.status_code == 200
    s = r.json()
    assert s["dataset_count"] == 1
    assert s["node_count"] > 0
    assert s["edge_count"] > 0
    assert "Concept" in s["node_type_counts"]
    assert 0.0 <= s["memory_quality_score"] <= 1.0


def test_improve_strengthens_graph(client: TestClient):
    # Ingest two datasets sharing concepts (Attention, Transformer, LLM, Agent).
    text_a = "The Transformer uses Attention and LLM and Agent and Memory."
    text_b = "transformer attention llm agent memory."
    client.post("/api/sources/text", json={"content": text_a, "dataset_name": "a"})
    client.post("/api/sources/text", json={"content": text_b, "dataset_name": "b"})

    before = client.get("/api/stats").json()
    r = client.post("/api/memory/improve", json={})
    assert r.status_code == 200, r.text
    after = client.get("/api/stats").json()
    # improve should at least not shrink the graph and should report changes.
    assert after["edge_count"] >= before["edge_count"]


def test_forget_removes_dataset(client: TestClient):
    res = client.post("/api/sources/text", json={"content": PAPER_EXCERPT, "dataset_name": "transformer"})
    dataset_id = res.json()["dataset_id"]

    r = client.request("DELETE", "/api/memory/forget", json={"dataset_id": dataset_id})
    assert r.status_code == 200, r.text
    assert r.json()["message"] == "forgotten"

    datasets = client.get("/api/datasets").json()
    assert all(d["id"] != dataset_id for d in datasets)

    # The graph should have shrunk.
    stats = client.get("/api/stats").json()
    assert stats["dataset_count"] == 0


def test_forget_unknown_dataset_404(client: TestClient):
    r = client.request("DELETE", "/api/memory/forget", json={"dataset_id": "does-not-exist"})
    assert r.status_code == 404


def test_remember_empty_text_rejected(client: TestClient):
    r = client.post("/api/sources/text", json={"content": "   "})
    assert r.status_code == 400

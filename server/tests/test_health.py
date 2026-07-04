"""Root + health endpoints."""

from fastapi.testclient import TestClient


def test_root_lists_backend(client: TestClient):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["name"].startswith("AEGIS")
    assert body["docs"] == "/docs"


def test_health(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["healthy"] is True
    assert body["backend"] == "memory"
    assert body["message"] == "ok"


def test_openapi_docs_available(client: TestClient):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    schema = r.json()
    # All lifecycle paths present.
    paths = schema["paths"]
    for expected in [
        "/api/sources/text",
        "/api/memory/recall",
        "/api/memory/improve",
        "/api/memory/forget",
        "/api/datasets",
        "/api/stats",
        "/api/health",
    ]:
        assert expected in paths, f"missing {expected}"

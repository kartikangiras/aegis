"""Source parser unit tests (no network)."""

from unittest.mock import patch

import pytest

from app.parsers import parse_github, parse_pdf, parse_text, parse_url, parse_youtube


def test_parse_text_passes_through():
    assert parse_text("hello") == "hello"
    with pytest.raises(ValueError):
        parse_text("   ")


def test_parse_pdf_rejects_empty():
    with pytest.raises(ValueError):
        parse_pdf(b"")


def test_parse_url_requires_http_scheme():
    with pytest.raises(ValueError):
        parse_url("ftp://example.com")


def test_parse_github_normalizes_urls_and_calls_api():
    captured = {}

    class FakeResponse:
        status_code = 200
        text = "# My Repo\n\nA cool project."

    class FakeClient:
        def __init__(self, *a, **kw):
            captured["headers"] = kw.get("headers", {})

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, url, *a, **kw):
            captured["url"] = url
            return FakeResponse()

    with patch("app.parsers.httpx.Client", FakeClient):  # noqa
        out = parse_github("https://github.com/openai/whisper", token="tok")

    assert "openai/whisper" in captured["url"]
    assert captured["headers"].get("Authorization") == "Bearer tok"
    assert "openai/whisper" in out
    assert "A cool project" in out


def test_parse_github_rejects_bare_name():
    with pytest.raises(ValueError):
        parse_github("justoneword")


def test_parse_youtube_extracts_id_from_url(monkeypatch):
    captured = {}

    class FakeApi:
        def fetch(self, ident, *a, **kw):
            captured["ident"] = ident
            return [{"start": 0.0, "text": "hello"}, {"start": 2.0, "text": "world"}]

    monkeypatch.setattr("youtube_transcript_api.YouTubeTranscriptApi", FakeApi)
    out = parse_youtube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=shared")
    assert captured["ident"] == "dQw4w9WgXcQ"
    assert "hello" in out and "world" in out


def test_parse_youtube_handles_missing_transcript(monkeypatch):
    class FakeApi:
        def fetch(self, ident, *a, **kw):
            raise RuntimeError("disabled")

    monkeypatch.setattr("youtube_transcript_api.YouTubeTranscriptApi", FakeApi)
    with pytest.raises(ValueError):
        parse_youtube("abc123")

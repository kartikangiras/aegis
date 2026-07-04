"""Ingestion parsers.

Each parser turns a supported source type (see ``project.md`` → SUPPORTED
INPUTS) into plain text that is handed to ``MemoryProvider.remember()``.

All parsers are sync and best-effort: they raise ``ValueError`` with a
helpful message on failure so the API can return a clean 4xx.
"""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

import httpx

logger = logging.getLogger("aegis.parsers")


def parse_text(text: str) -> str:
    """Markdown / TXT / research notes — already text."""
    if not text or not text.strip():
        raise ValueError("Empty content.")
    return text


def parse_pdf(data: bytes, *, filename: str = "upload.pdf") -> str:
    """Extract text from a PDF using pypdf (lazy import)."""
    if not data:
        raise ValueError("Empty PDF.")
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("pypdf is not installed") from exc

    reader = PdfReader(BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(pages).strip()
    if not text:
        raise ValueError(f"No extractable text in {filename}.")
    return text


def parse_url(url: str) -> str:
    """Fetch and extract the main content of a web article (trafilatura)."""
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http(s)://")
    try:
        import trafilatura
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("trafilatura is not installed") from exc

    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"Could not download {url}.")
    text = trafilatura.extract(downloaded, include_comments=False, include_tables=True)
    if not text:
        raise ValueError(f"No extractable content at {url}.")
    return text


def parse_github(repo: str, *, token: str = "") -> str:
    """Fetch the README of a GitHub repository as Markdown.

    Accepts ``owner/name`` or a full github.com URL.
    """
    repo = repo.strip()
    if "github.com/" in repo:
        repo = repo.split("github.com/", 1)[1].strip("/")
    repo = repo.rstrip("/").removesuffix(".git").strip("/").split("/")[0:2]
    if len(repo) < 2:
        raise ValueError("Expected owner/name for GitHub repository.")
    owner, name = repo[0], repo[1]

    headers = {"Accept": "application/vnd.github.raw"} | (
        {"Authorization": f"Bearer {token}"} if token else {}
    )
    url = f"https://api.github.com/repos/{owner}/{name}/readme"
    with httpx.Client(timeout=30, headers=headers, follow_redirects=True) as client:
        resp = client.get(url)
    if resp.status_code == 404:
        raise ValueError(f"No README found for {owner}/{name}.")
    if resp.status_code != 200:
        raise ValueError(f"GitHub API error {resp.status_code}: {resp.text[:200]}")
    return f"# {owner}/{name}\n\n{resp.text}"


def parse_youtube(url_or_id: str) -> str:
    """Fetch a YouTube transcript (youtube-transcript-api)."""
    ident = url_or_id.strip()
    if "youtu" in ident:
        # https://www.youtube.com/watch?v=ID  or  youtu.be/ID
        if "v=" in ident:
            ident = ident.split("v=", 1)[1].split("&")[0]
        elif "youtu.be/" in ident:
            ident = ident.split("youtu.be/", 1)[1].split("?")[0]
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("youtube-transcript-api is not installed") from exc

    try:
        parts = YouTubeTranscriptApi().fetch(ident)
    except Exception as exc:  # broad: transcript may be disabled, geo-blocked, ...
        raise ValueError(f"Could not fetch transcript for {ident}: {exc}") from exc

    def _text(p: Any) -> str:
        if isinstance(p, dict):
            return p.get("text", "")
        return getattr(p, "text", "") or ""

    def _start(p: Any) -> float:
        if isinstance(p, dict):
            return float(p.get("start", 0.0) or 0.0)
        return float(getattr(p, "start", 0.0) or 0.0)

    lines = [f"[{_start(p):.1f}s] {_text(p)}" for p in parts]
    return f"YouTube transcript ({ident}):\n\n" + "\n".join(lines)


PARSERS: dict[str, Any] = {
    "text": parse_text,
    "pdf": parse_pdf,
    "url": parse_url,
    "github": parse_github,
    "youtube": parse_youtube,
}

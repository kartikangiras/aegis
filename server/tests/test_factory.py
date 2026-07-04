"""Provider factory selection."""

from app.config import settings


def test_factory_memory_backend_builds_in_memory(monkeypatch):
    from memory.factory import get_memory_provider, reset_memory_provider
    from memory.providers.in_memory import InMemoryProvider

    monkeypatch.setattr(settings, "memory_backend", "memory")
    reset_memory_provider()
    try:
        provider = get_memory_provider()
        assert isinstance(provider, InMemoryProvider)
        assert provider.backend_name == "memory"
    finally:
        reset_memory_provider()


def test_factory_unknown_backend_raises(monkeypatch):
    from memory.factory import get_memory_provider, reset_memory_provider

    monkeypatch.setattr(settings, "memory_backend", "vaporware")
    reset_memory_provider()
    try:
        try:
            get_memory_provider()
        except ValueError as exc:
            assert "vaporware" in str(exc)
        else:
            raise AssertionError("expected ValueError for unknown backend")
    finally:
        reset_memory_provider()
        monkeypatch.setattr(settings, "memory_backend", "opensource")
        reset_memory_provider()

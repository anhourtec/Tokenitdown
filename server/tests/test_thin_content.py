"""Thin-content guard: a URL that fetches but yields ~no text must fail loudly
(ThinContentError → HTTP 422 / MCP ToolError) rather than return empty Markdown
that looks like a successful, token-saving conversion. Covers JS-rendered SPAs."""

import pytest
from fastapi.testclient import TestClient

import app.conversion as conv
import app.main as main

TOKEN = "test-service-token-1234567890"


class _DummyResult:
    def __init__(self, markdown, title=None):
        self.markdown = markdown
        self.title = title


class _DummyResp:
    """Stands in for the requests.Response context manager from safe_get."""

    def raise_for_status(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


def test_is_thin_thresholds():
    assert conv._is_thin("")
    assert conv._is_thin("   \n\t  ")
    assert conv._is_thin("# Hi")  # a bare title extracted from an SPA shell
    assert not conv._is_thin("This is a real article with plenty of readable body text.")


def test_convert_url_raises_thin_on_empty_render(monkeypatch):
    # Simulate an SPA: fetch succeeds, but the raw HTML converts to ~nothing.
    monkeypatch.setattr(conv, "assert_safe_url", lambda url: None)
    monkeypatch.setattr(conv, "safe_get", lambda url: _DummyResp())
    monkeypatch.setattr(conv._md, "convert_response", lambda resp: _DummyResult("   \n  "))

    with pytest.raises(conv.ThinContentError):
        conv.convert_url("https://spa.example.com/")


def test_convert_url_passes_real_content(monkeypatch):
    monkeypatch.setattr(conv, "assert_safe_url", lambda url: None)
    monkeypatch.setattr(conv, "safe_get", lambda url: _DummyResp())
    monkeypatch.setattr(
        conv._md,
        "convert_response",
        lambda resp: _DummyResult("# Real\n\nLots of readable content on this page.", "Real"),
    )

    result = conv.convert_url("https://good.example.com/")
    assert "readable content" in result.markdown


def test_convert_url_endpoint_maps_thin_to_422(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_TOKEN", TOKEN)

    def _raise_thin(_url):
        raise conv.ThinContentError("almost no text")

    monkeypatch.setattr(main.conversion, "convert_url", _raise_thin)

    client = TestClient(main.app)
    resp = client.post(
        "/convert-url",
        json={"url": "https://spa.example.com/"},
        headers={"X-Service-Token": TOKEN},
    )
    assert resp.status_code == 422, resp.text
    assert "almost no text" in resp.json()["detail"]

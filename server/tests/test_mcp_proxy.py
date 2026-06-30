"""Tests for the HTTP-mode proxy helpers (agent → web convert pipeline).

The network is mocked; we assert the right request is made and the web app's
response/errors are surfaced correctly.
"""

import asyncio

import pytest
from fastmcp.exceptions import ToolError

import app.mcp_server as mcp_server
from app.mcp_server import _decode_base64, _web_convert_document, _web_convert_url


def _run(coro):
    return asyncio.run(coro)


class _FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        if self._payload is _BAD_JSON:
            raise ValueError("no json")
        return self._payload


_BAD_JSON = object()


class _FakeClient:
    last = None

    def __init__(self, response):
        self._response = response

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, *, headers=None, json=None, files=None):
        _FakeClient.last = {"url": url, "headers": headers, "json": json, "files": files}
        return self._response


def _patch(monkeypatch, response):
    monkeypatch.setattr(mcp_server, "WEB_URL", "http://web:3000")
    monkeypatch.setattr(mcp_server.httpx, "AsyncClient", _FakeClient(response))


def test_decode_base64_rejects_garbage():
    with pytest.raises(ToolError, match="not valid base64"):
        _decode_base64("!!!nope!!!")


def test_proxy_url_forwards_key_and_returns_markdown(monkeypatch):
    _patch(monkeypatch, _FakeResponse(200, {"markdown": "# Hello", "title": "Hello"}))
    md = _run(_web_convert_url("tid_secret", "https://example.com"))
    assert md == "# Hello"
    assert _FakeClient.last["url"] == "http://web:3000/api/convert/url"
    assert _FakeClient.last["headers"]["Authorization"] == "Bearer tid_secret"
    assert _FakeClient.last["json"] == {"url": "https://example.com"}


def test_proxy_document_sends_multipart(monkeypatch):
    _patch(monkeypatch, _FakeResponse(200, {"markdown": "data"}))
    md = _run(_web_convert_document("tid_secret", b"a,b\n1,2\n", "scores.csv"))
    assert md == "data"
    assert _FakeClient.last["url"] == "http://web:3000/api/convert"
    assert "file" in _FakeClient.last["files"]
    name, data, mimetype = _FakeClient.last["files"]["file"]
    assert name == "scores.csv" and data == b"a,b\n1,2\n"


def test_proxy_surfaces_web_error_message(monkeypatch):
    _patch(monkeypatch, _FakeResponse(422, {"error": "This page could not be converted."}))
    with pytest.raises(ToolError, match="could not be converted"):
        _run(_web_convert_url("tid_secret", "https://example.com"))


def test_proxy_unauthorized_is_surfaced(monkeypatch):
    _patch(monkeypatch, _FakeResponse(401, {"error": "Unauthorized"}))
    with pytest.raises(ToolError, match="Unauthorized"):
        _run(_web_convert_url("tid_bad", "https://example.com"))

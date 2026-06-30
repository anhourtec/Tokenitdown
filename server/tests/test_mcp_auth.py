"""Tests for the HTTP MCP bearer-token verifier (per-user keys + admin token)."""

import asyncio
import contextlib

import app.mcp_auth as mcp_auth
from app.mcp_auth import TokenItDownVerifier


def _run(coro):
    return asyncio.run(coro)


class _FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _FakeClient:
    """Stand-in for httpx.AsyncClient that records the request and returns a canned response."""

    last_request = None

    def __init__(self, response):
        self._response = response

    def __call__(self, *args, **kwargs):  # constructed as httpx.AsyncClient(timeout=...)
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, *, headers, json):
        _FakeClient.last_request = {"url": url, "headers": headers, "json": json}
        return self._response


@contextlib.contextmanager
def _patch_http(monkeypatch, response):
    monkeypatch.setattr(mcp_auth.httpx, "AsyncClient", _FakeClient(response))
    yield


def test_admin_token_accepted_without_network():
    v = TokenItDownVerifier(admin_token="admin-secret-123")
    tok = _run(v.verify_token("admin-secret-123"))
    assert tok is not None
    assert tok.client_id == "admin"
    assert "convert" in tok.scopes


def test_wrong_admin_token_rejected():
    v = TokenItDownVerifier(admin_token="admin-secret-123")
    assert _run(v.verify_token("nope")) is None


def test_empty_token_rejected():
    v = TokenItDownVerifier(admin_token="admin-secret-123")
    assert _run(v.verify_token("")) is None


def test_per_user_key_validated_via_web(monkeypatch):
    v = TokenItDownVerifier(verify_url="http://web:3000/api/mcp/verify", service_token="svc-tok")
    with _patch_http(monkeypatch, _FakeResponse(200, {"userId": "user_42"})):
        tok = _run(v.verify_token("tid_abc123"))
    assert tok is not None
    assert tok.client_id == "user_42"
    # The user's key travels in the body; the caller authenticates with the service token.
    assert _FakeClient.last_request["headers"]["X-Service-Token"] == "svc-tok"
    assert _FakeClient.last_request["json"] == {"key": "tid_abc123"}


def test_per_user_key_rejected_on_401(monkeypatch):
    v = TokenItDownVerifier(verify_url="http://web:3000/api/mcp/verify", service_token="svc-tok")
    with _patch_http(monkeypatch, _FakeResponse(401, {"error": "Invalid key."})):
        assert _run(v.verify_token("tid_bad")) is None


def test_admin_checked_before_web(monkeypatch):
    # An admin-token match must short-circuit before any network call.
    v = TokenItDownVerifier(
        admin_token="admin-secret-123",
        verify_url="http://web:3000/api/mcp/verify",
        service_token="svc-tok",
    )
    _FakeClient.last_request = None
    with _patch_http(monkeypatch, _FakeResponse(401, {})):
        tok = _run(v.verify_token("admin-secret-123"))
    assert tok is not None and tok.client_id == "admin"
    assert _FakeClient.last_request is None  # no web call made

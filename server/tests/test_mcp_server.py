"""Tests for the TokenItDown MCP server.

Tools are exercised through FastMCP's in-memory client (no network/subprocess).
Conversions run for real against MarkItDown so the wiring is verified end-to-end.
"""

import asyncio
import base64

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from app.mcp_server import build_server


def _run(coro):
    return asyncio.run(coro)


async def _tool_names(server):
    async with Client(server) as client:
        return {t.name for t in await client.list_tools()}


async def _call(server, name, args):
    async with Client(server) as client:
        result = await client.call_tool(name, args)
        return result.data


# --- tool registration boundary (the security-relevant part) -------------------

def test_url_tool_in_both_modes():
    assert "convert_url_to_markdown" in _run(_tool_names(build_server(http=False)))
    assert "convert_url_to_markdown" in _run(_tool_names(build_server(http=True)))


def test_local_file_tool_only_in_stdio():
    stdio = _run(_tool_names(build_server(http=False)))
    http = _run(_tool_names(build_server(http=True)))
    # Reading a server-side path must never be exposed over the network.
    assert "convert_file_to_markdown" in stdio
    assert "convert_file_to_markdown" not in http


def test_document_upload_tool_only_in_http():
    stdio = _run(_tool_names(build_server(http=False)))
    http = _run(_tool_names(build_server(http=True)))
    assert "convert_document" in http
    assert "convert_document" not in stdio


# --- local file conversion (stdio mode) ----------------------------------------

def test_convert_file_to_markdown(tmp_path):
    csv = tmp_path / "scores.csv"
    csv.write_text("name,score\nAlice,1\nBob,2\n")
    md = _run(_call(build_server(http=False), "convert_file_to_markdown", {"path": str(csv)}))
    assert "Alice" in md and "Bob" in md


def test_convert_file_missing_path():
    server = build_server(http=False)
    with pytest.raises(ToolError, match="No file found"):
        _run(_call(server, "convert_file_to_markdown", {"path": "/no/such/file.pdf"}))


def test_convert_file_oversize(tmp_path, monkeypatch):
    monkeypatch.setattr("app.conversion.MAX_UPLOAD_BYTES", 8)
    big = tmp_path / "big.txt"
    big.write_text("0123456789")
    server = build_server(http=False)
    with pytest.raises(ToolError, match="maximum allowed size"):
        _run(_call(server, "convert_file_to_markdown", {"path": str(big)}))


# --- uploaded document conversion (http mode) ----------------------------------

def test_convert_document_base64():
    payload = base64.b64encode(b"name,score\nAlice,1\n").decode()
    md = _run(
        _call(
            build_server(http=True),
            "convert_document",
            {"content_base64": payload, "filename": "scores.csv"},
        )
    )
    assert "Alice" in md


def test_convert_document_rejects_bad_base64():
    server = build_server(http=True)
    with pytest.raises(ToolError, match="not valid base64"):
        _run(_call(server, "convert_document", {"content_base64": "!!!not-base64!!!", "filename": "x.csv"}))


# --- URL conversion / SSRF -----------------------------------------------------

def test_convert_url_blocks_internal_target():
    # Link-local metadata address is rejected before any network I/O.
    server = build_server(http=False)
    with pytest.raises(ToolError):
        _run(_call(server, "convert_url_to_markdown", {"url": "http://169.254.169.254/latest/meta-data/"}))


# --- auth wiring ---------------------------------------------------------------

def test_http_server_has_auth_when_token_set(monkeypatch):
    monkeypatch.setattr("app.mcp_server.MCP_TOKEN", "super-secret-token-1234567890")
    server = build_server(http=True)
    assert server.auth is not None


def test_http_server_has_no_auth_without_token(monkeypatch):
    monkeypatch.setattr("app.mcp_server.MCP_TOKEN", "")
    server = build_server(http=True)
    assert server.auth is None

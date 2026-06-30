"""TokenItDown MCP server — exposes document/URL → Markdown to AI coding agents.

This is the integration that lets a developer's agent (Claude Code, Cursor, VS Code
Copilot, Claude Desktop, …) call TokenItDown automatically: the moment a user points
the agent at a file or a web page, the agent calls one of these tools and gets back
clean, LLM-ready Markdown instead of raw bytes or HTML.

It runs in two modes, chosen by the ``TOKENITDOWN_MCP_HTTP`` env var:

  * **stdio** (default) — for local editors. The editor launches this as a
    subprocess and talks over stdin/stdout. Conversion happens in-process on the
    user's own machine, so it can read local files directly with no upload and no
    account::

        python -m app.mcp_server

  * **streamable HTTP** — for the hosted / self-hosted service, reachable by remote
    clients over the network and protected by a bearer token::

        TOKENITDOWN_MCP_HTTP=1 TOKENITDOWN_MCP_TOKEN=<secret> python -m app.mcp_server

Security boundary: the local-filesystem tool (``convert_file_to_markdown``) is
registered **only** in stdio mode. Over HTTP, where ``path`` would be an arbitrary
file read on the server, callers instead send the document's bytes as base64
(``convert_document``). URL conversion is SSRF-guarded in both modes.
"""

from __future__ import annotations

import base64
import binascii
import mimetypes
import os

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

from . import conversion

HTTP_MODE = os.environ.get("TOKENITDOWN_MCP_HTTP") == "1"
HTTP_HOST = os.environ.get("TOKENITDOWN_MCP_HOST", "0.0.0.0")
HTTP_PORT = int(os.environ.get("TOKENITDOWN_MCP_PORT", "8001"))
# When set (required for HTTP mode in practice), callers must present
# ``Authorization: Bearer <token>``.
MCP_TOKEN = os.environ.get("TOKENITDOWN_MCP_TOKEN", "")


def _url_to_markdown(url: str) -> str:
    """Shared body for the URL tool (SSRF-guarded fetch → Markdown)."""
    try:
        return conversion.convert_url(url).markdown
    except (conversion.ConversionError, conversion.UnsafeURLError) as exc:
        raise ToolError(str(exc)) from exc


def _bytes_to_markdown(data: bytes, *, filename: str) -> str:
    mimetype, _ = mimetypes.guess_type(filename)
    try:
        return conversion.convert_bytes(data, filename=filename, mimetype=mimetype).markdown
    except conversion.ConversionError as exc:
        raise ToolError(str(exc)) from exc


def build_server(*, http: bool = False) -> FastMCP:
    """Construct the MCP server, registering the tools appropriate for the mode.

    ``http=True`` adds bearer-token auth (when ``TOKENITDOWN_MCP_TOKEN`` is set) and
    swaps the local-file tool for the base64 upload tool.
    """
    auth = None
    if http and MCP_TOKEN:
        # Simple static bearer token — the lowest-friction secure option for a first
        # hosted version. Swap for a JWT/OAuth provider once API keys are issued
        # per user.
        from fastmcp.server.auth.providers.jwt import StaticTokenVerifier

        auth = StaticTokenVerifier(
            tokens={MCP_TOKEN: {"client_id": "tokenitdown", "scopes": ["convert"]}},
        )

    mcp = FastMCP(
        name="TokenItDown",
        instructions=(
            "TokenItDown turns documents and web pages into clean, LLM-ready "
            "Markdown. Call these tools whenever the user references a file or a URL "
            "you need to read, summarize, quote, or extract from — the Markdown they "
            "return is far cheaper and more accurate to reason over than raw bytes "
            "or HTML."
        ),
        auth=auth,
    )

    @mcp.tool
    def convert_url_to_markdown(url: str) -> str:
        """Convert a web page or online document into clean, LLM-ready Markdown.

        Use this whenever the user gives you an http(s) URL — an article, blog post,
        documentation page, Wikipedia entry, YouTube video (returns the transcript),
        RSS feed, or a link to a PDF/Office file — and wants its contents read,
        summarized, quoted, compared, or analyzed.

        Prefer this over fetching the URL yourself: it strips navigation, ads,
        scripts, and boilerplate and returns only the meaningful content as Markdown,
        which is cheaper and more accurate to reason over than raw HTML.

        Args:
            url: The full http(s) URL to convert.

        Returns:
            The page's content as Markdown.
        """
        return _url_to_markdown(url)

    if http:

        @mcp.tool
        def convert_document(content_base64: str, filename: str) -> str:
            """Convert an uploaded document into clean, LLM-ready Markdown.

            Use this to read a file the user has provided as raw bytes. Supports PDF,
            Word (.docx), PowerPoint (.pptx), Excel (.xlsx)/CSV, images, audio, EPUB,
            HTML, JSON, ZIP, Outlook (.msg) and more.

            Args:
                content_base64: The file's bytes, base64-encoded.
                filename: Original filename including its extension — used to pick the
                    correct parser (e.g. "report.pdf").

            Returns:
                The document's content as Markdown.
            """
            try:
                data = base64.b64decode(content_base64, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ToolError("content_base64 is not valid base64.") from exc
            return _bytes_to_markdown(data, filename=filename or "upload")

    else:

        @mcp.tool
        def convert_file_to_markdown(path: str) -> str:
            """Convert a local file on the user's machine into clean, LLM-ready Markdown.

            Use this whenever the user points you at a document on disk — PDF, Word
            (.docx), PowerPoint (.pptx), Excel (.xlsx)/CSV, images, audio, EPUB, HTML,
            JSON, ZIP, Outlook (.msg) and more — and wants its contents read,
            summarized, searched, or extracted. It returns the document's text as
            Markdown so you can reason over it directly, without the user copy-pasting
            anything.

            Always prefer this to guessing a binary file's contents from its name.

            Args:
                path: Absolute or working-directory-relative path to the file.

            Returns:
                The file's content as Markdown.
            """
            resolved = os.path.expanduser(path)
            if not os.path.isfile(resolved):
                raise ToolError(f"No file found at {path!r}.")
            if os.path.getsize(resolved) > conversion.MAX_UPLOAD_BYTES:
                raise ToolError("File exceeds the maximum allowed size.")
            try:
                with open(resolved, "rb") as fh:
                    data = fh.read()
            except OSError as exc:
                raise ToolError(f"Could not read {path!r}.") from exc
            return _bytes_to_markdown(data, filename=os.path.basename(resolved))

    return mcp


mcp = build_server(http=HTTP_MODE)


def main() -> None:
    if HTTP_MODE:
        if not MCP_TOKEN:
            # Fail loud rather than expose an unauthenticated conversion endpoint.
            raise SystemExit(
                "TOKENITDOWN_MCP_TOKEN must be set when TOKENITDOWN_MCP_HTTP=1 "
                "(an HTTP MCP server without auth is an open proxy)."
            )
        mcp.run(transport="http", host=HTTP_HOST, port=HTTP_PORT)
    else:
        mcp.run()


if __name__ == "__main__":
    main()

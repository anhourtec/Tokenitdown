"""SSRF protection for URL-based conversion.

MarkItDown performs I/O with the privileges of the current process: ``convert_uri``
will happily fetch any URL, including internal services and the cloud metadata
endpoint. Since the URL ultimately comes from an authenticated dashboard user, we
must validate it before fetching. See the "Security Considerations" section of the
MarkItDown docs.

``assert_safe_url`` rejects non-http(s) schemes and any host that resolves to a
private, loopback, link-local (incl. 169.254.169.254 metadata), multicast or
reserved address. ``safe_get`` fetches a URL while re-validating every redirect
hop so a public URL can't bounce us to an internal one.

Note: a small TOCTOU window remains between DNS resolution here and the resolution
performed by ``requests`` (DNS-rebinding). This is acceptable for the MVP; pin to
the resolved IP if this service is ever exposed to fully untrusted input.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests

DEFAULT_TIMEOUT = 30
MAX_REDIRECTS = 5
USER_AGENT = "TokenItDown/1.0 (+https://github.com/anhourtec/tokenitdown)"


class UnsafeURLError(ValueError):
    """Raised when a URL is not safe to fetch (bad scheme or private target)."""


def _ip_is_blocked(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


def assert_safe_url(url: str) -> None:
    """Raise UnsafeURLError unless ``url`` is an http(s) URL whose host resolves
    exclusively to public, routable addresses."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeURLError(f"Only http and https URLs are allowed (got {parsed.scheme or 'none'!r}).")

    host = parsed.hostname
    if not host:
        raise UnsafeURLError("URL is missing a host.")

    # A bare IP literal still needs checking (e.g. http://169.254.169.254).
    try:
        ipaddress.ip_address(host)
        candidates = {host}
    except ValueError:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        try:
            infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
        except socket.gaierror as exc:
            raise UnsafeURLError(f"Could not resolve host {host!r}.") from exc
        candidates = {info[4][0] for info in infos}

    if not candidates:
        raise UnsafeURLError(f"Could not resolve host {host!r}.")

    for ip in candidates:
        if _ip_is_blocked(ip):
            raise UnsafeURLError(f"URL host {host!r} resolves to a blocked address ({ip}).")


def safe_get(url: str, *, timeout: int = DEFAULT_TIMEOUT) -> requests.Response:
    """GET ``url``, validating the target before each hop and following at most
    MAX_REDIRECTS redirects. Returns a streamed ``requests.Response``."""
    session = requests.Session()
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        assert_safe_url(current)
        resp = session.get(
            current,
            timeout=timeout,
            allow_redirects=False,
            stream=True,
            headers={"User-Agent": USER_AGENT},
        )
        if resp.is_redirect or resp.is_permanent_redirect:
            location = resp.headers.get("Location")
            resp.close()
            if not location:
                raise UnsafeURLError("Redirect response had no Location header.")
            current = urljoin(current, location)
            continue
        return resp
    raise UnsafeURLError("Too many redirects.")

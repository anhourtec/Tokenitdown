"""SSRF protection for URL-based conversion.

MarkItDown performs I/O with the privileges of the current process: ``convert_uri``
will happily fetch any URL, including internal services and the cloud metadata
endpoint. Since the URL ultimately comes from an authenticated dashboard user, we
must validate it before fetching. See the "Security Considerations" section of the
MarkItDown docs.

``assert_safe_url`` rejects non-http(s) schemes and any host that resolves to a
private, loopback, link-local (incl. 169.254.169.254 metadata), multicast or
reserved address. ``safe_get`` goes further: it resolves the host once, validates
every resolved address, then connects to that exact **pinned IP** (re-validating
on each redirect hop). Because the socket targets the address we validated — not
whatever DNS returns at connect time — the DNS-rebinding (TOCTOU) window between
validation and the request is closed. TLS SNI and certificate verification stay
bound to the original hostname, so HTTPS still verifies correctly.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager

DEFAULT_TIMEOUT = 30
MAX_REDIRECTS = 5

# Present as a normal browser. Many sites reject the default python-requests /
# bot user-agents outright (connection reset, 403). This doesn't defeat sites
# that fingerprint TLS or require JS/login (e.g. major paywalled news), but it
# fixes the large class of sites that only filter on User-Agent.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


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


def _resolve_validated_ips(scheme: str, host: str, port: int | None) -> list[str]:
    """Resolve ``host`` and return its addresses, raising :class:`UnsafeURLError`
    if the host can't be resolved or any resolved address is non-public. Returns
    at least one validated, routable IP (order preserved, de-duplicated)."""
    try:
        ipaddress.ip_address(host)
        candidates = [host]
    except ValueError:
        resolve_port = port or (443 if scheme == "https" else 80)
        try:
            infos = socket.getaddrinfo(host, resolve_port, proto=socket.IPPROTO_TCP)
        except socket.gaierror as exc:
            raise UnsafeURLError(f"Could not resolve host {host!r}.") from exc
        seen: set[str] = set()
        candidates = []
        for info in infos:
            ip = info[4][0]
            if ip not in seen:
                seen.add(ip)
                candidates.append(ip)

    if not candidates:
        raise UnsafeURLError(f"Could not resolve host {host!r}.")

    for ip in candidates:
        if _ip_is_blocked(ip):
            raise UnsafeURLError(f"URL host {host!r} resolves to a blocked address ({ip}).")
    return candidates


def assert_safe_url(url: str) -> None:
    """Raise UnsafeURLError unless ``url`` is an http(s) URL whose host resolves
    exclusively to public, routable addresses."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeURLError(f"Only http and https URLs are allowed (got {parsed.scheme or 'none'!r}).")

    host = parsed.hostname
    if not host:
        raise UnsafeURLError("URL is missing a host.")

    _resolve_validated_ips(parsed.scheme, host, parsed.port)


class _PinnedIPAdapter(HTTPAdapter):
    """Pin TLS SNI + certificate verification to the original hostname while the
    socket connects to a pre-validated IP literal (carried in the request URL).

    Only mounted for https:// targets — plain http:// needs no SNI and these SSL
    keywords would be rejected by the non-TLS connection.
    """

    def __init__(self, hostname: str, **kwargs):
        self._hostname = hostname
        super().__init__(**kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["server_hostname"] = self._hostname
        pool_kwargs["assert_hostname"] = self._hostname
        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            **pool_kwargs,
        )


def safe_get(url: str, *, timeout: int = DEFAULT_TIMEOUT) -> requests.Response:
    """GET ``url``, resolving + validating + pinning the target IP before each hop
    and following at most MAX_REDIRECTS redirects. Returns a streamed
    ``requests.Response`` whose ``.url`` is the original hostname URL (so
    downstream relative-link resolution is unaffected by the IP pinning)."""
    session = requests.Session()
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        parsed = urlparse(current)
        if parsed.scheme not in ("http", "https"):
            raise UnsafeURLError(f"Only http and https URLs are allowed (got {parsed.scheme or 'none'!r}).")
        host = parsed.hostname
        if not host:
            raise UnsafeURLError("URL is missing a host.")

        pinned_ip = _resolve_validated_ips(parsed.scheme, host, parsed.port)[0]
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        ip_host = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        pinned_url = f"{parsed.scheme}://{ip_host}:{port}{path}"

        # The Host header carries the real authority (host[:port], minus any
        # userinfo) exactly as written, so virtual-hosted servers route correctly.
        headers = {**BROWSER_HEADERS, "Host": parsed.netloc.rsplit("@", 1)[-1]}

        if parsed.scheme == "https":
            # Pin SNI/cert verification to the real hostname for the IP connection.
            # Plain http needs no SNI and uses the session's default adapter.
            session.mount(f"{parsed.scheme}://{ip_host}:{port}", _PinnedIPAdapter(host))
        resp = session.get(
            pinned_url,
            timeout=timeout,
            allow_redirects=False,
            stream=True,
            headers=headers,
        )
        if resp.is_redirect or resp.is_permanent_redirect:
            location = resp.headers.get("Location")
            resp.close()
            if not location:
                raise UnsafeURLError("Redirect response had no Location header.")
            current = urljoin(current, location)
            continue
        resp.url = current
        return resp
    raise UnsafeURLError("Too many redirects.")

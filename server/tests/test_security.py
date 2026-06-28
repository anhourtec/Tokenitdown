import pytest

from app.security import UnsafeURLError, assert_safe_url


@pytest.mark.parametrize(
    "url",
    [
        "http://169.254.169.254/latest/meta-data/",  # cloud metadata (link-local)
        "http://localhost:8000/",  # loopback by name
        "http://127.0.0.1/",  # loopback literal
        "http://10.0.0.1/",  # private
        "http://192.168.1.1/",  # private
        "http://172.16.5.4/",  # private
        "http://[::1]/",  # IPv6 loopback
        "file:///etc/passwd",  # non-http scheme
        "ftp://example.com/x",  # non-http scheme
        "data:text/plain;base64,SGk=",  # data scheme
        "http:///nohost",  # missing host
    ],
)
def test_blocks_unsafe_urls(url):
    with pytest.raises(UnsafeURLError):
        assert_safe_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "http://8.8.8.8/",  # public IP literal
    ],
)
def test_allows_public_urls(url):
    # Should not raise (these resolve to / are public addresses).
    assert_safe_url(url)

import io

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.main import app

TOKEN = "test-service-token-1234567890"


@pytest.fixture(autouse=True)
def _set_token(monkeypatch):
    # require_token reads the module-level SERVICE_TOKEN captured at import time.
    monkeypatch.setattr(main, "SERVICE_TOKEN", TOKEN)


@pytest.fixture
def client():
    return TestClient(app)


def _auth():
    return {"X-Service-Token": TOKEN}


def test_health_is_open(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_convert_requires_token(client):
    resp = client.post("/convert", files={"file": ("a.csv", b"a,b\n1,2\n", "text/csv")})
    assert resp.status_code == 401


def test_convert_rejects_bad_token(client):
    resp = client.post(
        "/convert",
        files={"file": ("a.csv", b"a,b\n1,2\n", "text/csv")},
        headers={"X-Service-Token": "wrong"},
    )
    assert resp.status_code == 401


def test_convert_csv_to_markdown(client):
    csv = b"name,score\nAlice,1\nBob,2\n"
    resp = client.post(
        "/convert",
        files={"file": ("scores.csv", csv, "text/csv")},
        headers=_auth(),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # CSV becomes a Markdown table — the cell values must survive.
    assert "Alice" in body["markdown"]
    assert "Bob" in body["markdown"]


def test_convert_html_to_markdown(client):
    html = b"<html><body><h1>Hello</h1><p>World</p></body></html>"
    resp = client.post(
        "/convert",
        files={"file": ("page.html", html, "text/html")},
        headers=_auth(),
    )
    assert resp.status_code == 200, resp.text
    md = resp.json()["markdown"]
    assert "Hello" in md
    assert "World" in md


def test_convert_json_to_markdown(client):
    resp = client.post(
        "/convert",
        files={"file": ("data.json", b'{"hello": "world"}', "application/json")},
        headers=_auth(),
    )
    assert resp.status_code == 200, resp.text
    assert "world" in resp.json()["markdown"]


def test_convert_empty_file_rejected(client):
    resp = client.post(
        "/convert",
        files={"file": ("empty.txt", b"", "text/plain")},
        headers=_auth(),
    )
    assert resp.status_code == 400


def test_convert_oversize_rejected(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 8)
    resp = client.post(
        "/convert",
        files={"file": ("big.txt", b"0123456789", "text/plain")},
        headers=_auth(),
    )
    assert resp.status_code == 413


def test_convert_url_blocks_internal(client):
    resp = client.post(
        "/convert-url",
        json={"url": "http://169.254.169.254/latest/meta-data/"},
        headers=_auth(),
    )
    assert resp.status_code == 400


def test_convert_url_requires_token(client):
    resp = client.post("/convert-url", json={"url": "https://example.com"})
    assert resp.status_code == 401

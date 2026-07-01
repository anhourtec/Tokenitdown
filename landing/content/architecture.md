---
eyebrow: How it works
title: One codebase, two ways to run it
lede: A clean service split you can read end to end. Run it as managed cloud, or bring the whole stack up locally with one command and no data egress.
services:
  - name: Web
    body: Next.js app for the dashboard, auth, and API routes. Convert requests are proxied to the processing service over an internal network, gated by a shared secret.
  - name: Processing
    body: A Python FastAPI wrapper around Microsoft MarkItDown. Uploads and SSRF-guarded URL fetches become Markdown. Internal only.
  - name: MCP server
    body: The agent endpoint. In hosted mode it validates an API key and proxies conversions back through the web pipeline, so agent activity is cleaned, tracked, and saved like any other.
  - name: Postgres
    body: Users, sessions, converted documents (tagged with the key that made them), and API keys stored as SHA-256 hashes.
  - name: Redis
    body: Reserved for the job queue and session store.
deploy:
  - name: Cloud
    body: Multi-tenant SaaS with managed processing, billing, and a hosted MCP endpoint.
  - name: Self-hosted
    body: One docker compose up brings up web, Postgres, Redis, the processing service, the MCP server, and the docs. All processing local.
---

---
eyebrow: For developers and agents
title: Install once. Convert from anywhere.
lede: A built-in Model Context Protocol server, a CLI for any package manager, a downloadable skill, and a REST API. Your agent calls TokenItDown the moment you hand it a file or URL.
install:
  title: Install the CLI
  managers:
    - name: npm
      cmd: npm i -g tokenitdown
    - name: pnpm
      cmd: pnpm add -g tokenitdown
    - name: yarn
      cmd: yarn global add tokenitdown
    - name: bun
      cmd: bun add -g tokenitdown
skill:
  title: Add it as an agent skill
  cmd: npx skills add https://github.com/anhourtec/Tokenitdown --skill tokenitdown
mcp:
  title: Connect over MCP
  local:
    label: Local (stdio) — convert your own files, no account
    cmd: claude mcp add tokenitdown -- python -m app.mcp_server
  hosted:
    label: Hosted (HTTP) — remote agents, per-user key
    cmd: |
      claude mcp add --transport http tokenitdown https://mcp.your-domain.com/mcp \
        --header "Authorization: Bearer YOUR_TOKENITDOWN_API_KEY"
tools:
  - name: convert_url_to_markdown
    body: Fetch a web page or online document and return clean Markdown.
  - name: convert_file_to_markdown
    body: Convert a local file on disk (local / stdio mode).
  - name: convert_document
    body: Convert an uploaded file's bytes over the hosted endpoint.
api:
  title: Or call the API
  body: Send one file, get Markdown back, then drop the same call into your agent, RAG job, or batch pipeline.
  cmd: |
    curl -X POST https://api.your-domain.com/v1/convert \
      -H "Authorization: Bearer $TOKENITDOWN_API_KEY" \
      -F "file=@./paper.pdf"
---

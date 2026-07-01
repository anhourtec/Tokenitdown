---
eyebrow: Questions
title: What people ask before they trust it
items:
  - q: Why can't ChatGPT or Claude read PDFs properly?
    a: PDFs are rendering instructions, not structured data. They describe where to place pixels, not what content means. Fed a PDF directly, an LLM loses table relationships, multi-column reading order, heading hierarchy, and list structure. Converting to Markdown first gives the model clean, semantic text it can actually reason over.
  - q: What is the best document format for AI?
    a: Markdown. It preserves structure (headings, lists, tables, code) in a lightweight text format that drops straight into a context window with zero preprocessing, which is why RAG pipelines, agents, and knowledge bases standardize on it.
  - q: How do I prepare documents for a RAG pipeline?
    a: Convert to Markdown first to keep heading hierarchy, table structure, and reading order, then chunk by semantic sections using headings as natural boundaries rather than fixed token counts. TokenItDown produces Markdown optimized for exactly this.
  - q: Does it work with agents other than Claude?
    a: Yes. The MCP server works with any MCP host (Claude Code, Cursor, VS Code Copilot, Claude Desktop, Codex, Gemini, Windsurf), and the Connect page ships instance-aware AGENTS.md, CLAUDE.md, and skills.md drop-in files so any agent knows to use it.
  - q: Is my data secure?
    a: On a self-hosted instance, nothing leaves your machine. Every file and URL is converted by the local processing service, originals are stored on your own volume, and API keys are kept as SHA-256 hashes. URL conversion is SSRF-guarded.
  - q: Is it really open source?
    a: Yes, MIT licensed. Run the managed cloud, or bring the entire stack up yourself with one docker compose command. No lock-in.
---

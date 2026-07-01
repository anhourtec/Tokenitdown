---
title: Markdown to agents, HTML to humans
description: Why the same document should be served two ways, and how converting to Markdown first cuts token cost while making AI answers more accurate.
date: 2026-06-30
author: AnHourTec
tags: [rag, agents, markdown, tokens]
---

Browsers want HTML. Language models want meaning. Those are not the same thing, and treating them as one is why so many AI document workflows quietly underperform.

## HTML and PDF are for rendering, not reading

A PDF is a set of instructions for placing glyphs on a page. HTML is a tree of presentation. Neither encodes what the content *means*, which is exactly what a language model needs. Feed either one to a model directly and three things go wrong at once: tables lose their column relationships, multi-column layouts scramble the reading order, and navigation, ads, and script noise eat tokens the model then has to reason around.

## Convert first, then reason

Converting to clean Markdown fixes the input before it ever reaches the model. Headings survive as headings, tables survive as tables, and the boilerplate is gone. The result is smaller, so it costs fewer tokens, and clearer, so answers get more accurate. That is the whole thesis: **Markdown to agents, HTML to humans.**

## What this looks like in practice

Serve HTML to browsers for people to read. Serve Markdown to agents over MCP or an API for machines to reason over. Same source, two representations, each shaped for its reader. TokenItDown does the second half: it turns any document or URL into clean, token-counted Markdown, keeps the original, and hands it to your agent the moment you point at a file.

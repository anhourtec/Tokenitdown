---
eyebrow: The problem
title: Markdown to agents, HTML to humans
lede: Raw PDFs and HTML are rendering instructions, not meaning. Hand one to an LLM and tables collapse, reading order scrambles, and you pay tokens for boilerplate the model then misreads. Convert to clean Markdown first and the model gets structure it can actually reason over, for a fraction of the tokens.
before:
  title: Raw bytes into the model
  points:
    - Tables break and columns misalign
    - Multi-column reading order scrambles
    - Nav, ads, and script noise burn tokens
    - Formulas and structure get corrupted
after:
  title: Cleaned Markdown into the model
  points:
    - Tables preserved as real Markdown tables
    - Natural reading order, headings intact
    - Boilerplate stripped, token count counted
    - Original kept and re-processable
---

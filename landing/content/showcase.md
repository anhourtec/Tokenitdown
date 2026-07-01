---
eyebrow: See it in action
title: Real documents. Structure preserved.
lede: Handwriting, dense tables, official forms, and academic papers all come back as clean Markdown with hierarchy, tables, and reading order intact.
samples:
  - name: Handwritten form
    note: Reads handwritten entries inside a printed form
    markdown: |
      **Form 5500-EZ** — Annual Return of a One-Participant Retirement Plan

      | Field | Value |
      |---|---|
      | Plan name | Annual Return Plan |
      | Plan number (PN) | 586 |
      | Effective date | 02/05/2022 |
      | Employer | Acme Corp Software |
      | EIN | 735268329 |

      **Part III — Financial Information**

      | Item | Beginning of year | End of year |
      |---|---|---|
      | Total plan assets | $50,000 | $60,000 |
      | Total plan liabilities | $4,000 | $5,000 |
  - name: Financial tables
    note: Merged cells and numeric columns kept aligned
    markdown: |
      ## Q3 Summary

      | Segment | Revenue | YoY | Margin |
      |---|--:|--:|--:|
      | Platform | $4.20M | +18% | 61% |
      | Services | $1.10M | +7% | 42% |
      | Total | **$5.30M** | **+15%** | **57%** |
  - name: Tax form
    note: Checkbox state and labels captured
    markdown: |
      **Part I — Annual Return Identification**

      - [x] First return filed for the plan
      - [ ] Amended return
      - [ ] Final return
      - [ ] Short plan year (less than 12 months)

      For the calendar plan year **2023**.
  - name: Research paper
    note: Headings, equations, and reading order preserved
    markdown: |
      # Attention Is All You Need

      ## Abstract

      We propose the Transformer, a model architecture relying entirely on
      attention mechanisms, dispensing with recurrence and convolutions.

      The attention function scales dot products by `1/sqrt(d_k)`:

      > Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V
---

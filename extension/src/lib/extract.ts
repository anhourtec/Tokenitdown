import { Readability, isProbablyReaderable } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { ExtractResult } from "../types";

/**
 * Builds a Turndown service configured for clean, LLM-ready Markdown:
 * ATX headings (`#`), fenced code blocks, and GFM tables/strikethrough/task lists.
 */
function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    linkStyle: "inlined",
  });
  td.use(gfm);

  // Drop elements that never carry useful content but survive Readability
  // on some pages (embedded styles/scripts, forms, inline SVG icons).
  td.remove(["script", "style", "noscript", "form"]);
  td.remove((node) => node.nodeName === "SVG");

  return td;
}

/**
 * Extracts the main content of a page and converts it to Markdown.
 *
 * Strategy:
 *  1. Clone the document — Readability mutates the DOM it parses, so we never
 *     touch the live page.
 *  2. Run Readability to isolate the article body (strips nav/footer/ads/chrome).
 *  3. Convert the extracted HTML to Markdown with Turndown + GFM.
 *
 * Falls back to converting `<body>` directly when Readability finds no article
 * (common on apps, landing pages, dashboards). The `source` field records which
 * path produced the output so the router can later decide whether the DOM result
 * is good enough or the page should go to the vision path.
 */
export function extractMarkdown(doc: Document, pageUrl: string): ExtractResult {
  const td = createTurndown();
  const readerable = isProbablyReaderable(doc);

  // Readability mutates its input — always give it a clone.
  const article = new Readability(doc.cloneNode(true) as Document).parse();
  const articleText = article?.textContent?.trim() ?? "";

  if (article && article.content && articleText.length > 0) {
    const markdown = normalize(td.turndown(article.content));
    return {
      markdown,
      title: (article.title || doc.title || "").trim(),
      byline: article.byline ?? null,
      excerpt: article.excerpt ?? null,
      textLength: articleText.length,
      url: pageUrl,
      source: "readability",
      readerable,
    };
  }

  // Fallback: no article detected — convert the body as-is. Lower quality, but
  // still useful, and the thin/empty result is the signal the router needs.
  const bodyHtml = doc.body?.innerHTML ?? "";
  const markdown = normalize(td.turndown(bodyHtml));
  return {
    markdown,
    title: (doc.title || "").trim(),
    byline: null,
    excerpt: null,
    textLength: markdown.trim().length,
    url: pageUrl,
    source: "fallback",
    readerable,
  };
}

/**
 * Collapses runs of 3+ blank lines to a single blank line and trims trailing
 * whitespace, so the output is compact and diff-friendly.
 */
function normalize(markdown: string): string {
  return markdown
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

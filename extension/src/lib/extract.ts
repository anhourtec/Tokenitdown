import { Readability, isProbablyReaderable } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { ExtractResult } from "../types";

/** Below this fraction of the page's visible text, Readability is dropping too
 *  much (common on marketing/landing/app pages built from card grids and widgets
 *  that Readability scores as boilerplate) — convert the whole body instead so we
 *  don't lose the bulk of the page. The M4 clean stage then strips the chrome. */
export const COVERAGE_MIN = 0.6;

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
 * Decides whether to abandon Readability's article and convert the whole body.
 * True when the article covers less than `coverageMin` of the page's text — i.e.
 * Readability isolated a small slice and threw the rest away. Pure/unit-testable.
 */
export function preferFullBody(
  articleTextLength: number,
  pageTextLength: number,
  coverageMin = COVERAGE_MIN
): boolean {
  if (pageTextLength <= 0) return false;
  return articleTextLength < coverageMin * pageTextLength;
}

/** Length of the page's visible text. Uses `innerText` (layout-aware, excludes
 *  hidden/script text) in a real browser; falls back to `textContent` in a
 *  headless DOM where `innerText` isn't implemented. */
function pageTextLength(doc: Document): number {
  const body = doc.body;
  if (!body) return 0;
  return collapsedLength((body.innerText ?? "") || body.textContent || "");
}

function collapsedLength(s: string): number {
  return s.replace(/\s+/g, " ").trim().length;
}

/**
 * Extracts a page's content as Markdown.
 *
 *  1. Clone the document — Readability mutates what it parses.
 *  2. Run Readability to isolate the article (strips nav/footer/ads/chrome).
 *  3. Use that **only if it covers enough of the page** (`COVERAGE_MIN`). On
 *     marketing/app pages Readability drops most of the content, so we instead
 *     convert the whole `<body>` (chrome and all — the M4 clean stage trims it).
 *  4. Convert the chosen HTML to Markdown with Turndown + GFM.
 *
 * `source` records which path won (`readability` = clean article, `fallback` =
 * whole body) so the router/telemetry can reason about quality.
 */
export function extractMarkdown(doc: Document, pageUrl: string): ExtractResult {
  const td = createTurndown();
  const readerable = isProbablyReaderable(doc);

  // Readability mutates its input — always give it a clone.
  const article = new Readability(doc.cloneNode(true) as Document).parse();
  const articleText = article?.textContent?.trim() ?? "";
  const hasArticle = !!(article && article.content && articleText.length > 0);

  const useReadability =
    hasArticle &&
    !preferFullBody(collapsedLength(articleText), pageTextLength(doc));

  if (useReadability) {
    const markdown = normalize(td.turndown(article!.content!));
    return {
      markdown,
      title: (article!.title || doc.title || "").trim(),
      byline: article!.byline ?? null,
      excerpt: article!.excerpt ?? null,
      textLength: articleText.length,
      url: pageUrl,
      source: "readability",
      readerable,
    };
  }

  // Full-body conversion — Readability found no article, or isolated too little
  // of the page. Lower-level but complete; the M4 clean stage strips the chrome.
  const bodyHtml = doc.body?.innerHTML ?? "";
  const markdown = normalize(td.turndown(bodyHtml));
  return {
    markdown,
    title: (article?.title || doc.title || "").trim(),
    byline: article?.byline ?? null,
    excerpt: article?.excerpt ?? null,
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

import type { CleanResult } from "../types";

/**
 * M4 — the clean stage.
 *
 * Strips residual boilerplate from the extracted Markdown so the output is
 * token-cheap and LLM-ready: cookie/consent banners, social-share rows,
 * newsletter prompts, copyright/legal footers, standalone nav link bars, and
 * consecutive duplicate lines.
 *
 * Deliberately HIGH-PRECISION (conservative): it only removes lines that are
 * almost certainly chrome, and never touches headings (`#…`), blockquotes
 * (`>…`, which carry M3 region descriptions), or normal prose — losing real
 * content is far worse than leaving a little cruft. An aggressive LLM "prune"
 * can layer on top of this later.
 */

/** Whole-line phrases (tested against the line with Markdown syntax stripped)
 *  that mark page chrome rather than content. */
const BOILERPLATE_PATTERNS: RegExp[] = [
  // Cookie / consent
  /\bwe use cookies\b/i,
  /\bthis (website|site) uses cookies\b/i,
  /^(accept|reject|allow)( all)?( cookies)?$/i,
  /^cookie (policy|settings|preferences|consent)$/i,
  // Navigation / skip links
  /^skip to (main )?content$/i,
  /^back to top$/i,
  /^menu$/i,
  // Social / sharing / follow
  /^share( this)?( (on|to|via) \w+)?$/i,
  /^(share on|follow us on) /i,
  /^(tweet|pin it|email this)$/i,
  // Newsletter / subscribe CTAs
  /^(subscribe|sign up) (to|for) (our )?(newsletter|mailing list)/i,
  /^get (the )?(latest|our) (news|updates)/i,
  // Auth nav
  /^(sign in|log in|login|register|sign up|create account)$/i,
  // Legal / footer
  /^©\s*\d{4}/,
  /^\(c\)\s*\d{4}/i,
  /all rights reserved\.?$/i,
  /^(privacy policy|terms (of (service|use))?|cookie policy|legal|imprint)$/i,
  // Misc chrome
  /^advertisement$/i,
  /^loading(\.{1,3})?$/i,
  /\byou (need to|must) enable javascript\b/i,
];

/** A standalone line made up of this many Markdown links (and only separators)
 *  is treated as a nav/menu bar. Conservative — single reference links survive. */
const NAV_LINK_MIN = 4;

const MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/g;

/** Strips Markdown syntax to the bare text of a line, for phrase matching. */
function plainLine(line: string): string {
  return line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link → its text
    .replace(/[*_`~]+/g, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeadingOrQuote(line: string): boolean {
  return /^\s*(#{1,6}\s|>)/.test(line);
}

function isBoilerplate(line: string): boolean {
  // Never strip structural headings or blockquotes (M3 descriptions live in `>`).
  if (isHeadingOrQuote(line)) return false;
  const text = plainLine(line);
  if (!text) return false;
  return BOILERPLATE_PATTERNS.some((re) => re.test(text));
}

/** Whether a line is just a row of links (a nav/menu bar) with no real text. */
function isNavLinkLine(line: string): boolean {
  if (isHeadingOrQuote(line)) return false;
  const trimmed = line.replace(/^[-*+]\s+/, "").trim();
  if (!trimmed) return false;

  const links = trimmed.match(MARKDOWN_LINK);
  if (!links || links.length < NAV_LINK_MIN) return false;

  // Everything that isn't a link must be only separators/whitespace.
  const rest = trimmed.replace(MARKDOWN_LINK, "").replace(/[|·•‹›<>/\\\-–—,\s]+/g, "");
  return rest.length === 0;
}

/** Drops consecutive duplicate non-empty lines (repeated headers/footers/items). */
function dedupeConsecutive(lines: string[]): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (const line of lines) {
    const key = line.trim();
    if (key && key === prev) continue;
    out.push(line);
    if (key) prev = key;
  }
  return out;
}

export function cleanMarkdown(markdown: string): CleanResult {
  const lines = markdown.split("\n");
  let removedLines = 0;

  const filtered: string[] = [];
  for (const line of lines) {
    if (isBoilerplate(line) || isNavLinkLine(line)) {
      removedLines++;
      continue;
    }
    filtered.push(line);
  }

  const beforeDedupe = filtered.length;
  const deduped = dedupeConsecutive(filtered);
  removedLines += beforeDedupe - deduped.length;

  const cleaned = deduped
    .join("\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown: cleaned, removedLines };
}

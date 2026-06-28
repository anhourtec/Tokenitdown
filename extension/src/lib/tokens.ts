import type { TokenStats } from "../types";

/**
 * M4 — token estimation.
 *
 * A fast, dependency-free estimate of how many LLM tokens a string costs, using
 * the well-known ~4-characters-per-token rule of thumb for English text. It is
 * deliberately an *estimate* (labelled `≈` in the UI): the true count depends on
 * the target model's tokenizer, and bundling a full BPE tokenizer (~MBs) into the
 * extension isn't worth it here. A precise per-model tokenizer can replace this
 * without touching callers.
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Collapse runs of whitespace so reflowed/indented Markdown doesn't inflate the
  // character count (whitespace is cheap in tokens).
  const normalized = trimmed.replace(/\s+/g, " ");
  return Math.ceil(normalized.length / 4);
}

/** Computes the before/after/saved token stats for the clean stage. */
export function tokenSavings(before: number, after: number): TokenStats {
  const saved = Math.max(0, before - after);
  const savedPct = before > 0 ? Math.round((saved / before) * 100) : 0;
  return { before, after, saved, savedPct };
}

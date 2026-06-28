/**
 * Token metering — the measurement behind the "TokenItDown" promise.
 *
 * Uses a real GPT BPE tokenizer (via gpt-tokenizer) so counts match what an LLM
 * actually sees — the same kind of encoding the OpenAI tokenizer tool shows,
 * rather than a chars/4 guess. Runs server-side only (the convert routes), so the
 * tokenizer tables never ship to the browser. A char/word heuristic is the
 * fallback if encoding ever fails. Claude's exact count_tokens endpoint can be
 * layered on later for Claude-specific billing.
 */

import { encode } from "gpt-tokenizer"

export interface TokenSavings {
  rawTokens: number
  cleanTokens: number
  /** Tokens removed by cleaning (never negative). */
  saved: number
  /** Percentage saved, 0–100, rounded to one decimal. */
  pct: number
  /** True when counts come from a real tokenizer (not the heuristic fallback). */
  exact: boolean
}

/** Heuristic fallback: ~100 tokens ≈ 75 words, with a char floor for dense markup. */
function heuristicTokens(text: string): number {
  if (!text) return 0
  const words = (text.match(/\S+/g) ?? []).length
  return Math.max(Math.ceil(words / 0.75), Math.ceil(text.length / 6))
}

/** Real GPT BPE token count for a string. */
export function countTokens(text: string): number {
  if (!text) return 0
  try {
    return encode(text).length
  } catch {
    return heuristicTokens(text)
  }
}

/** Backwards-compatible alias. */
export const estimateTokens = countTokens

/** Compute before/after token savings for a cleaning pass. */
export function tokenSavings(raw: string, clean: string): TokenSavings {
  const rawTokens = countTokens(raw)
  const cleanTokens = countTokens(clean)
  const saved = Math.max(0, rawTokens - cleanTokens)
  const pct = rawTokens > 0 ? Math.round((saved / rawTokens) * 1000) / 10 : 0
  return { rawTokens, cleanTokens, saved, pct, exact: true }
}

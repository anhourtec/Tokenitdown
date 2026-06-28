/**
 * Heading-based chunking for RAG export. Splits cleaned Markdown at heading
 * boundaries (H1/H2 by default) into retrieval-sized chunks, each with an exact
 * token count. The clean pass guarantees a sane heading tree, so this is a
 * near-free way to produce chunk boundaries. Fenced code is never split.
 *
 * See plans/clean-process-outputs-and-competitive-coverage.md §4.2.
 */

import { countTokens } from "./tokens"

export interface Chunk {
  index: number
  heading: string | null
  text: string
  tokens: number
}

export interface ChunkOptions {
  /** Start a new chunk at headings up to this level (1–6). Default 2 (H1/H2). */
  maxLevel?: number
}

/** Ideal chunk size for retrieval (tokens). Auto-detect aims chunks near this. */
const TARGET_CHUNK_TOKENS = 500

/**
 * Pick the heading level (1–3) that best chunks this document: as granular as
 * possible while keeping chunks near the retrieval-friendly target size and not
 * fragmenting into many tiny pieces. Falls back to 1 for flat/heading-less docs.
 */
export function detectChunkLevel(markdown: string): number {
  let best = 1
  let bestScore = Infinity
  for (const level of [1, 2, 3]) {
    const chunks = chunkByHeadings(markdown, { maxLevel: level })
    if (chunks.length === 0) continue
    const sorted = chunks.map((c) => c.tokens).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0
    const tinyFraction = chunks.filter((c) => c.tokens < 60).length / chunks.length
    // Distance from the target size, plus a penalty for over-fragmenting.
    const score = Math.abs(median - TARGET_CHUNK_TOKENS) + tinyFraction * TARGET_CHUNK_TOKENS
    if (score < bestScore) {
      bestScore = score
      best = level
    }
  }
  return best
}

/** True for a heading line at or above `maxLevel`, ignoring lines inside code fences. */
function headingLevel(line: string): number {
  const m = line.match(/^(#{1,6})\s+\S/)
  return m ? (m[1] as string).length : 0
}

export function chunkByHeadings(markdown: string, opts: ChunkOptions = {}): Chunk[] {
  const maxLevel = Math.min(6, Math.max(1, opts.maxLevel ?? 2))
  const lines = markdown.split("\n")

  const blocks: { heading: string | null; lines: string[] }[] = []
  let current: { heading: string | null; lines: string[] } | null = null
  let inFence = false

  for (const line of lines) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) inFence = !inFence
    const level = inFence ? 0 : headingLevel(line)

    if (level > 0 && level <= maxLevel) {
      if (current) blocks.push(current)
      current = { heading: line.replace(/^#{1,6}\s+/, "").trim(), lines: [line] }
    } else {
      if (!current) current = { heading: null, lines: [] }
      current.lines.push(line)
    }
  }
  if (current) blocks.push(current)

  return blocks
    .map((b) => ({ heading: b.heading, text: b.lines.join("\n").trim() }))
    .filter((b) => b.text.length > 0)
    .map((b, index) => ({ index, heading: b.heading, text: b.text, tokens: countTokens(b.text) }))
}

/** Serialize chunks to JSONL (one JSON object per line) for RAG pipelines. */
export function chunksToJsonl(chunks: Chunk[], docTitle: string): string {
  return chunks
    .map((c) => JSON.stringify({ id: `${c.index}`, title: docTitle, heading: c.heading, text: c.text, tokens: c.tokens }))
    .join("\n")
}

import { describe, expect, it } from "vitest"

import { chunkByHeadings, chunksToJsonl, detectChunkLevel } from "./chunk"

const DOC = `# Title

Intro paragraph.

## Section A

Body of A.

## Section B

Body of B.
`

describe("chunkByHeadings", () => {
  it("splits at H1/H2 boundaries by default", () => {
    const chunks = chunkByHeadings(DOC)
    expect(chunks.map((c) => c.heading)).toEqual(["Title", "Section A", "Section B"])
    expect(chunks[1]!.text).toContain("Body of A.")
    expect(chunks.every((c) => c.tokens > 0)).toBe(true)
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2])
  })

  it("keeps a leading preamble with no heading as its own chunk", () => {
    const chunks = chunkByHeadings("Loose intro text.\n\n## First\n\nbody")
    expect(chunks[0]!.heading).toBeNull()
    expect(chunks[0]!.text).toContain("Loose intro text.")
    expect(chunks[1]!.heading).toBe("First")
  })

  it("does not split on '#' inside fenced code blocks", () => {
    const md = "# Real\n\n```\n# not a heading\n```\n\nafter"
    const chunks = chunkByHeadings(md)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.text).toContain("# not a heading")
  })

  it("respects maxLevel = 1 (only H1 starts a chunk)", () => {
    const chunks = chunkByHeadings(DOC, { maxLevel: 1 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.heading).toBe("Title")
  })

  it("drops empty chunks", () => {
    const chunks = chunkByHeadings("## A\n\n## B\n\nonly b has body")
    expect(chunks.map((c) => c.heading)).toEqual(["A", "B"])
  })
})

describe("detectChunkLevel", () => {
  it("returns a level between 1 and 3", () => {
    const level = detectChunkLevel(DOC)
    expect(level).toBeGreaterThanOrEqual(1)
    expect(level).toBeLessThanOrEqual(3)
  })

  it("uses level 1 for a flat doc with one big section", () => {
    const big = "# Only Heading\n\n" + "word ".repeat(800)
    expect(detectChunkLevel(big)).toBe(1)
  })

  it("goes deeper when H2 sections are large and split into H3 subsections", () => {
    const para = (n: number) => "lorem ipsum dolor sit amet ".repeat(40) + ` (${n})`
    const md = ["# Title", `## Big A`, para(1), "### A1", para(2), "### A2", para(3), "## Big B", para(4), "### B1", para(5)].join(
      "\n\n"
    )
    expect(detectChunkLevel(md)).toBeGreaterThanOrEqual(2)
  })
})

describe("chunksToJsonl", () => {
  it("emits one valid JSON object per line", () => {
    const jsonl = chunksToJsonl(chunkByHeadings(DOC), "Title")
    const lines = jsonl.split("\n")
    expect(lines).toHaveLength(3)
    const first = JSON.parse(lines[0]!) as { id: string; title: string; heading: string | null; tokens: number }
    expect(first).toMatchObject({ id: "0", title: "Title", heading: "Title" })
    expect(typeof first.tokens).toBe("number")
  })
})

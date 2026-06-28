import { describe, expect, it } from "vitest"

import { countTokens, tokenSavings } from "./tokens"

describe("countTokens (GPT-4o / o200k_base)", () => {
  it("returns 0 for empty input", () => {
    expect(countTokens("")).toBe(0)
  })

  it("counts a simple phrase exactly", () => {
    // "hello world" is 2 tokens in o200k_base.
    expect(countTokens("hello world")).toBe(2)
  })

  it("grows with content length", () => {
    const short = countTokens("one two three")
    const long = countTokens("one two three four five six seven eight nine ten")
    expect(long).toBeGreaterThan(short)
  })

  it("is in a sane range for ~75 words", () => {
    const words = Array.from({ length: 75 }, () => "word").join(" ")
    const tokens = countTokens(words)
    expect(tokens).toBeGreaterThan(50)
    expect(tokens).toBeLessThan(160)
  })
})

describe("tokenSavings", () => {
  it("reports positive savings when cleaning shrinks the text and marks exact", () => {
    const raw = "Heading\n\n\n\n" + "filler ".repeat(200)
    const clean = "Heading\n\n" + "filler ".repeat(120)
    const s = tokenSavings(raw, clean)
    expect(s.rawTokens).toBeGreaterThan(s.cleanTokens)
    expect(s.saved).toBeGreaterThan(0)
    expect(s.pct).toBeGreaterThan(0)
    expect(s.exact).toBe(true)
  })

  it("never reports negative savings when cleaning grows the text", () => {
    const s = tokenSavings("short", "a much longer cleaned output than the original")
    expect(s.saved).toBe(0)
    expect(s.pct).toBe(0)
  })

  it("reports 0% for empty input", () => {
    expect(tokenSavings("", "").pct).toBe(0)
  })
})

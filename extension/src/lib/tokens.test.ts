import { describe, it, expect } from "vitest";
import { estimateTokens, tokenSavings } from "./tokens";

describe("estimateTokens", () => {
  it("is zero for empty/whitespace strings", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("   \n\t ")).toBe(0);
  });

  it("estimates ~4 characters per token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("does not let reflow whitespace inflate the count", () => {
    // Collapsed whitespace means indentation/newlines are cheap.
    expect(estimateTokens("a     b")).toBe(estimateTokens("a b"));
  });

  it("grows monotonically with content", () => {
    expect(estimateTokens("short")).toBeLessThan(
      estimateTokens("a much longer string with more words")
    );
  });
});

describe("tokenSavings", () => {
  it("computes saved count and rounded percentage", () => {
    expect(tokenSavings(1000, 620)).toEqual({
      before: 1000,
      after: 620,
      saved: 380,
      savedPct: 38,
    });
  });

  it("never reports negative savings when output grew", () => {
    const s = tokenSavings(100, 130);
    expect(s.saved).toBe(0);
    expect(s.savedPct).toBe(0);
  });

  it("handles an empty document without dividing by zero", () => {
    expect(tokenSavings(0, 0)).toEqual({ before: 0, after: 0, saved: 0, savedPct: 0 });
  });
});

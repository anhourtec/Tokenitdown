import { describe, expect, it } from "vitest"

import { formatBytes, getInitials } from "./utils"

describe("formatBytes", () => {
  it("returns '0 B' for zero, negative, or non-finite input", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(-5)).toBe("0 B")
    expect(formatBytes(Number.NaN)).toBe("0 B")
  })

  it("formats bytes, KB, MB, and GB", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(12345)).toBe("12.1 KB")
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB")
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB")
  })
})

describe("getInitials", () => {
  it("takes the first letter of up to each word", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL")
    expect(getInitials("madonna")).toBe("M")
    expect(getInitials("  ")).toBe("?")
  })
})

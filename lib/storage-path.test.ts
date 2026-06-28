import { describe, expect, it } from "vitest"

import path from "node:path"

import { buildStoragePath, resolveStoredFile, safeExtension } from "./storage-path"

describe("safeExtension", () => {
  it("returns a lowercase dotted extension", () => {
    expect(safeExtension("Report.PDF")).toBe(".pdf")
    expect(safeExtension("archive.tar.gz")).toBe(".gz")
  })

  it("returns empty string when there is no extension", () => {
    expect(safeExtension("noext")).toBe("")
    expect(safeExtension("")).toBe("")
    expect(safeExtension(null)).toBe("")
    expect(safeExtension(undefined)).toBe("")
  })

  it("never lets path separators or traversal into the extension", () => {
    // extname works on the basename, so a separator after the dot yields no ext.
    expect(safeExtension("evil.pd/f")).toBe("")
    expect(safeExtension("evil.../etc")).toBe("")
    expect(safeExtension("x.")).toBe("")
    // The result is always either "" or a dotted alnum-only extension.
    for (const name of ["a.b/../c.sh", "weird.<>:name.PnG", "..hidden", "report.pdf"]) {
      expect(safeExtension(name)).toMatch(/^(\.[a-z0-9]+)?$/)
    }
  })
})

describe("buildStoragePath", () => {
  it("joins userId, id and extension", () => {
    expect(buildStoragePath("user1", "abc", ".pdf")).toBe("user1/abc.pdf")
    expect(buildStoragePath("user1", "abc", "")).toBe("user1/abc")
  })
})

describe("resolveStoredFile", () => {
  const root = "/data/uploads"

  it("resolves a relative path under the root", () => {
    expect(resolveStoredFile(root, "user1/abc.pdf")).toBe(path.resolve(root, "user1/abc.pdf"))
  })

  it("rejects paths that escape the root", () => {
    expect(() => resolveStoredFile(root, "../../etc/passwd")).toThrow()
    expect(() => resolveStoredFile(root, "user1/../../secret")).toThrow()
  })
})

import { describe, expect, it } from "vitest"

import { resolveTargetDatabase } from "./ensure-db.mjs"

describe("resolveTargetDatabase", () => {
  it("extracts the target database and points the admin URL at `postgres`", () => {
    const { targetDb, adminUrl } = resolveTargetDatabase(
      "postgresql://tokenitdown:secret@192.168.69.16:5433/tokenitdown"
    )
    expect(targetDb).toBe("tokenitdown")
    expect(new URL(adminUrl).pathname).toBe("/postgres")
    // Credentials and host/port are preserved on the admin URL.
    expect(adminUrl).toContain("192.168.69.16:5433")
  })

  it("throws when DATABASE_URL is missing", () => {
    expect(() => resolveTargetDatabase("")).toThrow(/not set/i)
  })

  it("throws when the URL has no database name", () => {
    expect(() => resolveTargetDatabase("postgresql://user:pw@host:5432/")).toThrow(/no database name/i)
  })

  it("rejects unsafe database names (CREATE DATABASE can't be parameterized)", () => {
    expect(() => resolveTargetDatabase('postgresql://user:pw@host:5432/db";DROP')).toThrow(/unsafe/i)
  })
})

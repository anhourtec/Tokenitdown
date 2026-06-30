import { createHash } from "crypto"

import { describe, expect, it, vi } from "vitest"

// hashKey/generateApiKey are pure crypto; stub the db module so importing
// api-keys here doesn't construct a Postgres pool.
vi.mock("./db", () => ({ db: {}, schema: {} }))

import { generateApiKey, hashKey } from "./api-keys"

describe("api-keys", () => {
  it("hashKey is a stable sha256 hex of the token", () => {
    const token = "tid_example-token"
    expect(hashKey(token)).toBe(createHash("sha256").update(token).digest("hex"))
    expect(hashKey(token)).toBe(hashKey(token)) // deterministic
    expect(hashKey(token)).toHaveLength(64)
  })

  it("generateApiKey mints a tid_-prefixed token with matching hash and lastFour", () => {
    const { token, keyHash, lastFour } = generateApiKey()
    expect(token.startsWith("tid_")).toBe(true)
    expect(keyHash).toBe(hashKey(token))
    // lastFour is the tail of the secret (the part after the prefix).
    expect(token.endsWith(lastFour)).toBe(true)
    expect(lastFour).toHaveLength(4)
  })

  it("generates unique tokens", () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.token).not.toBe(b.token)
    expect(a.keyHash).not.toBe(b.keyHash)
  })
})

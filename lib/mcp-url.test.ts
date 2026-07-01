import { afterEach, describe, expect, it, vi } from "vitest"

// Mutable stand-in for the validated env, controlled per test. `vi.hoisted` runs
// before the hoisted `vi.mock` factory, so the reference is safe to share.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { BETTER_AUTH_URL: "https://tokenitdown.example.com" } as {
    BETTER_AUTH_URL: string
    MCP_PUBLIC_URL?: string
  },
}))
vi.mock("../env.mjs", () => ({ env: mockEnv }))

import { mcpPublicUrl } from "./mcp-url"

describe("mcpPublicUrl", () => {
  afterEach(() => {
    mockEnv.BETTER_AUTH_URL = "https://tokenitdown.example.com"
    mockEnv.MCP_PUBLIC_URL = undefined
  })

  it("uses MCP_PUBLIC_URL verbatim when set (reverse-proxied subdomain)", () => {
    mockEnv.MCP_PUBLIC_URL = "https://mcp.example.com/mcp"
    expect(mcpPublicUrl()).toBe("https://mcp.example.com/mcp")
  })

  it("falls back to the dashboard host + :8001/mcp when unset", () => {
    mockEnv.BETTER_AUTH_URL = "https://tokenitdown.example.com"
    expect(mcpPublicUrl()).toBe("https://tokenitdown.example.com:8001/mcp")
  })

  it("preserves the http scheme in the fallback (local dev)", () => {
    mockEnv.BETTER_AUTH_URL = "http://localhost:3000"
    expect(mcpPublicUrl()).toBe("http://localhost:8001/mcp")
  })
})

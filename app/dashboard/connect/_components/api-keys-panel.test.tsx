import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiKeysPanel } from "./api-keys-panel"

// next/link renders a plain <a> in tests.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const KEY = {
  id: "key_1",
  name: "Local testing",
  masked: "tid_…8W3l",
  createdAt: "2026-06-30T00:00:00.000Z",
  lastUsedAt: "2026-06-30T18:52:00.000Z",
  calls: 1,
  tokensSaved: 455,
}

const CONVERSION = {
  id: "doc_1",
  title: "BookYourPTO — Leave Management",
  sourceType: "url",
  sourceName: "https://bookyourpto.com/",
  mimetype: "text/html",
  sizeBytes: 12345,
  cleanTier: "clean",
  cleanStats: { webChromeRemoved: 3, boilerplateLinesRemoved: 2 },
  rawTokens: 1200,
  cleanTokens: 745,
  createdAt: "2026-06-30T18:52:00.000Z",
}

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === "/api/keys") {
      return new Response(JSON.stringify({ keys: [KEY] }), { status: 200 })
    }
    if (url === `/api/keys/${KEY.id}`) {
      return new Response(JSON.stringify({ conversions: [CONVERSION] }), { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
}

describe("ApiKeysPanel activity detail", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows source, size, type and a Library link when a key's activity is expanded", async () => {
    vi.stubGlobal("fetch", mockFetch())
    render(<ApiKeysPanel mcpUrl="https://mcp.example.com/mcp" />)

    // Key row renders once loaded.
    await waitFor(() => expect(screen.getByText("Local testing")).toBeInTheDocument())

    // Expand its activity.
    fireEvent.click(screen.getByRole("button", { name: /show activity/i }))

    // The converted document title appears, linking into the Library by doc id.
    const link = await screen.findByRole("link", { name: /Leave Management/i })
    expect(link).toHaveAttribute("href", `/dashboard/library?doc=${CONVERSION.id}`)

    // Row 2 surfaces the full source URL, size and mimetype.
    const row = link.closest("li") as HTMLElement
    expect(within(row).getByText(CONVERSION.sourceName)).toBeInTheDocument()
    expect(within(row).getByText(/12\.1 KB/)).toBeInTheDocument()
    expect(within(row).getByText(/text\/html/)).toBeInTheDocument()

    // The token-savings control reflects the 1200 -> 745 reduction (37.9%).
    expect(within(row).getByText(/−37\.9%/)).toBeInTheDocument()
  })
})

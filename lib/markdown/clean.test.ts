import { describe, expect, it } from "vitest"

import { cleanMarkdown } from "./clean"

describe("cleanMarkdown — tiers", () => {
  it("returns input unchanged for the raw tier", () => {
    const input = "#  Title  \n\n\n\nbody   "
    expect(cleanMarkdown(input, "raw").markdown).toBe(input)
  })

  it("is idempotent: clean(clean(x)) === clean(x)", () => {
    const input = "**Section One**\n\n| A  |  B |\n| --- | --- |\n| 1 | 2 |\n\n\n\ntail"
    const once = cleanMarkdown(input).markdown
    const twice = cleanMarkdown(once).markdown
    expect(twice).toBe(once)
  })
})

describe("heading promotion", () => {
  it("promotes a standalone title-like bold line to H2", () => {
    const { markdown, stats } = cleanMarkdown("**Introduction**\n\nText here.")
    expect(markdown).toContain("## Introduction")
    expect(stats.headingsPromoted).toBe(1)
  })

  it("leaves bold sentences (ending punctuation) alone", () => {
    const { markdown } = cleanMarkdown("**This is a bold sentence.**")
    expect(markdown).toContain("**This is a bold sentence.**")
  })
})

describe("table normalization", () => {
  it("collapses cell padding and normalizes the separator row", () => {
    const input = "|  Name   |  Age |\n| :------ | ----: |\n|  Ada    | 36 |"
    const { markdown, stats } = cleanMarkdown(input)
    expect(markdown).toContain("| Name | Age |")
    expect(markdown).toContain("| :--- | ---: |")
    expect(markdown).toContain("| Ada | 36 |")
    expect(stats.tablesNormalized).toBeGreaterThan(0)
  })
})

describe("de-hyphenation", () => {
  it("rejoins words split across a line break", () => {
    const { markdown, stats } = cleanMarkdown("This is impor-\ntant information.")
    expect(markdown).toContain("important information")
    expect(stats.hyphenationsJoined).toBe(1)
  })
})

describe("base64 image extraction", () => {
  it("strips data: URIs but keeps alt text", () => {
    const { markdown, stats } = cleanMarkdown("![a chart](data:image/png;base64,AAAA)")
    expect(markdown).toContain("![a chart]()")
    expect(markdown).not.toContain("data:")
    expect(stats.imagesExtracted).toBe(1)
  })

  it("leaves normal image links intact", () => {
    const { markdown } = cleanMarkdown("![logo](https://x.test/logo.png)")
    expect(markdown).toContain("![logo](https://x.test/logo.png)")
  })
})

describe("boilerplate / reading-order cleanup", () => {
  it("removes repeated bare page-number lines", () => {
    const input = ["Intro", "1", "Body A", "2", "Body B", "3"].join("\n\n")
    const { markdown, stats } = cleanMarkdown(input)
    expect(markdown).not.toMatch(/^\s*\d+\s*$/m)
    expect(stats.boilerplateLinesRemoved).toBe(3)
  })

  it("removes a running header repeated on every page", () => {
    const header = "ACME CONFIDENTIAL REPORT"
    const input = [header, "Page one body", header, "Page two body", header, "x", header, "y"].join("\n\n")
    const { markdown } = cleanMarkdown(input)
    expect(markdown).not.toContain(header)
  })
})

describe("whitespace + comments", () => {
  it("collapses blank-line runs and trims trailing space", () => {
    const { markdown } = cleanMarkdown("a   \n\n\n\nb")
    expect(markdown).toBe("a\n\nb\n")
  })

  it("strips HTML comments", () => {
    const { markdown } = cleanMarkdown("before<!-- secret -->after")
    expect(markdown).toBe("beforeafter\n")
  })
})

describe("code-block protection", () => {
  it("does not touch content inside fenced code blocks", () => {
    const input = "```\n|  not  | a table |\nimpor-\ntant\n```\n"
    const { markdown } = cleanMarkdown(input)
    expect(markdown).toContain("|  not  | a table |")
    expect(markdown).toContain("impor-\ntant")
  })
})

describe("unicode normalization", () => {
  it("expands ligatures and removes zero-width characters", () => {
    const zwsp = "​"
    const ligatureFi = "ﬁ"
    const { markdown } = cleanMarkdown(`e${zwsp}${ligatureFi}le`)
    expect(markdown).toBe("efile\n")
  })
})

describe("control characters", () => {
  const hasBadControl = (s: string) =>
    s.split("").some((ch) => {
      const c = ch.charCodeAt(0)
      return c !== 9 && c !== 10 && (c < 32 || (c >= 127 && c <= 159))
    })

  it("strips form feed / vertical tab / bell / DEL and normalizes CRLF", () => {
    const ff = String.fromCharCode(12)
    const vt = String.fromCharCode(11)
    const bell = String.fromCharCode(7)
    const del = String.fromCharCode(127)
    const input = `line one\r\nlist${ff}item${bell} here${vt}${del}`
    const { markdown } = cleanMarkdown(input)
    expect(hasBadControl(markdown)).toBe(false)
    expect(markdown).toContain("line one")
    expect(markdown).toContain("listitem here")
    expect(markdown).not.toContain("\r")
  })

  it("keeps tabs and newlines", () => {
    const { markdown } = cleanMarkdown("a\tb\n\nc")
    expect(markdown).toContain("a\tb")
  })
})

describe("compact tier", () => {
  it("strips link URLs but keeps text and images, and reports it", () => {
    const { markdown, stats } = cleanMarkdown("See [the docs](https://x.test) and ![img](https://x.test/i.png)", "compact")
    expect(markdown).toContain("See the docs and ![img](https://x.test/i.png)")
    expect(stats.linksStripped).toBe(1)
  })

  it("clean tier leaves links untouched", () => {
    const { markdown } = cleanMarkdown("See [the docs](https://x.test)")
    expect(markdown).toContain("[the docs](https://x.test)")
  })
})

describe("web boilerplate (web option)", () => {
  it("removes nav/footer link runs and cookie chrome, keeps real content", () => {
    const input = [
      "# Real Title",
      "",
      "- [Home](/)",
      "- [Features](/features)",
      "- [Pricing](/pricing)",
      "- [Docs](/docs)",
      "",
      "Accept all cookies",
      "",
      "Actual content paragraph that should stay.",
    ].join("\n")
    const { markdown, stats } = cleanMarkdown(input, "clean", { web: true })
    expect(markdown).toContain("# Real Title")
    expect(markdown).toContain("Actual content paragraph that should stay.")
    expect(markdown).not.toContain("/features")
    expect(markdown).not.toContain("Accept all cookies")
    expect(stats.webChromeRemoved).toBe(5)
  })

  it("leaves link runs intact when the web option is off", () => {
    const input = ["- [Home](/)", "- [Features](/features)", "- [Pricing](/pricing)"].join("\n")
    const { markdown, stats } = cleanMarkdown(input, "clean")
    expect(markdown).toContain("/features")
    expect(stats.webChromeRemoved).toBe(0)
  })
})

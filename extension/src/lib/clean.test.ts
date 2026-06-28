import { describe, it, expect } from "vitest";
import { cleanMarkdown } from "./clean";

describe("cleanMarkdown", () => {
  it("strips cookie/consent, social, newsletter, and legal boilerplate lines", () => {
    const md = [
      "# Real Article",
      "",
      "This website uses cookies to improve your experience.",
      "Subscribe to our newsletter for updates",
      "Share on Twitter",
      "Real body paragraph with useful content.",
      "© 2026 AnHourTec. All rights reserved.",
    ].join("\n");

    const { markdown } = cleanMarkdown(md);
    expect(markdown).toContain("# Real Article");
    expect(markdown).toContain("Real body paragraph with useful content.");
    expect(markdown).not.toMatch(/uses cookies/i);
    expect(markdown).not.toMatch(/newsletter/i);
    expect(markdown).not.toMatch(/Share on Twitter/i);
    expect(markdown).not.toMatch(/All rights reserved/i);
  });

  it("removes a nav bar (>=4 links on one line) but keeps a single reference link", () => {
    const md = [
      "[Home](/) | [About](/about) | [Blog](/blog) | [Contact](/contact)",
      "",
      "See the [specification](https://example.com/spec) for details.",
      "",
      "- [Lone reference](https://example.com/ref)",
    ].join("\n");

    const { markdown } = cleanMarkdown(md);
    expect(markdown).not.toContain("[Home](/)");
    expect(markdown).toContain("[specification](https://example.com/spec)");
    expect(markdown).toContain("[Lone reference](https://example.com/ref)");
  });

  it("never strips headings or blockquotes even if they match a phrase", () => {
    // A privacy-policy article legitimately has a "Privacy Policy" heading, and
    // M3 region descriptions live in blockquotes.
    const md = [
      "## Privacy Policy",
      "",
      "We collect the following data...",
      "",
      "> **Figure:** Cookie consumption by quarter",
    ].join("\n");

    const { markdown } = cleanMarkdown(md);
    expect(markdown).toContain("## Privacy Policy");
    expect(markdown).toContain("> **Figure:** Cookie consumption by quarter");
  });

  it("drops consecutive duplicate lines and reports the removed count", () => {
    const md = ["Heading", "Same line", "Same line", "Same line", "End"].join("\n");
    const { markdown, removedLines } = cleanMarkdown(md);

    expect(markdown).toBe("Heading\nSame line\nEnd");
    expect(removedLines).toBe(2); // two of the three duplicates removed
  });

  it("preserves clean content unchanged (no false positives)", () => {
    const md = "# Title\n\nA normal paragraph about cookies and recipes.\n\n## Section\n\nMore text.";
    const { markdown, removedLines } = cleanMarkdown(md);
    // "about cookies" is prose, not a banner — must survive.
    expect(markdown).toContain("A normal paragraph about cookies and recipes.");
    expect(removedLines).toBe(0);
  });

  it("collapses the blank lines left behind by removed boilerplate", () => {
    const md = "Para one.\n\nAdvertisement\n\nPara two.";
    const { markdown } = cleanMarkdown(md);
    expect(markdown).toBe("Para one.\n\nPara two.");
    expect(markdown).not.toMatch(/\n{3,}/);
  });
});

import { describe, it, expect } from "vitest";
import { extractMarkdown } from "./extract";

/** Builds a Document from an HTML string, the way the content script sees it. */
function docFromHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

const ARTICLE_HTML = `
<!DOCTYPE html>
<html>
  <head><title>How Tokenization Works</title></head>
  <body>
    <nav><a href="/home">Home</a><a href="/pricing">Pricing</a></nav>
    <header><h1>Site Banner</h1></header>
    <article>
      <h1>How Tokenization Works</h1>
      <p>Large language models read text as <strong>tokens</strong>, not words.
      A good converter keeps the <a href="https://example.com/spec">specification</a>
      intact while dropping page chrome.</p>
      <h2>Why it matters</h2>
      <ul>
        <li>Fewer tokens means lower cost.</li>
        <li>Clean structure improves retrieval.</li>
      </ul>
      <h2>Comparison</h2>
      <table>
        <thead><tr><th>Engine</th><th>Speed</th></tr></thead>
        <tbody>
          <tr><td>Fast path</td><td>Sub-second</td></tr>
          <tr><td>Vision path</td><td>Slow</td></tr>
        </tbody>
      </table>
    </article>
    <footer><p>© 2026 AnHourTec. All rights reserved.</p></footer>
  </body>
</html>
`;

describe("extractMarkdown", () => {
  it("extracts the main article as Markdown via Readability", () => {
    const result = extractMarkdown(docFromHtml(ARTICLE_HTML), "https://example.com/post");

    expect(result.source).toBe("readability");
    expect(result.title).toBe("How Tokenization Works");
    expect(result.url).toBe("https://example.com/post");
    expect(result.textLength).toBeGreaterThan(0);
  });

  it("preserves subheadings, emphasis and links", () => {
    const { markdown } = extractMarkdown(docFromHtml(ARTICLE_HTML), "https://example.com/post");

    // Readability strips the article's own title heading (it duplicates the
    // page title), but keeps in-body subheadings.
    expect(markdown).toMatch(/^##\s+Why it matters/m);
    expect(markdown).toContain("**tokens**");
    expect(markdown).toContain("[specification](https://example.com/spec)");
  });

  it("converts lists and GFM tables", () => {
    const { markdown } = extractMarkdown(docFromHtml(ARTICLE_HTML), "https://example.com/post");

    // Turndown indents list item content under the marker (`-   text`).
    expect(markdown).toMatch(/^-\s+Fewer tokens means lower cost\.$/m);
    // GFM table pipe syntax with a header separator row.
    expect(markdown).toContain("| Engine | Speed |");
    expect(markdown).toMatch(/\|\s*-+\s*\|/);
    expect(markdown).toContain("| Fast path | Sub-second |");
  });

  it("strips nav and footer boilerplate", () => {
    const { markdown } = extractMarkdown(docFromHtml(ARTICLE_HTML), "https://example.com/post");

    expect(markdown).not.toContain("Pricing");
    expect(markdown).not.toContain("All rights reserved");
  });

  it("falls back when Readability finds no article (canvas dashboard)", () => {
    // A canvas-rendered dashboard has no extractable text — the exact case the
    // router will later send to the vision path. Readability returns null here.
    const html = `<!DOCTYPE html><html><head><title>Dashboard</title></head>
      <body><div id="root"><canvas width="800" height="600"></canvas></div></body></html>`;
    const result = extractMarkdown(docFromHtml(html), "https://app.example.com");

    expect(result.source).toBe("fallback");
    expect(result.readerable).toBe(false);
    expect(result.title).toBe("Dashboard");
  });

  it("normalizes excessive blank lines", () => {
    const { markdown } = extractMarkdown(docFromHtml(ARTICLE_HTML), "https://example.com/post");
    expect(markdown).not.toMatch(/\n{3,}/);
  });
});

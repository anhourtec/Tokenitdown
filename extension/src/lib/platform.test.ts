import { describe, it, expect, vi } from "vitest";
import { convertHtmlToLibrary, PlatformError } from "./platform";

/** A fake fetch returning a canned JSON response. */
function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const opts = { baseUrl: "https://example.com", html: "<html><body>hi</body></html>", filename: "page.html" };

describe("convertHtmlToLibrary", () => {
  it("POSTs the HTML to {baseUrl}/api/convert with credentials and returns the saved doc", async () => {
    const fetchImpl = fakeFetch(200, { id: "doc1", title: "Hi", markdown: "# hi" });
    const doc = await convertHtmlToLibrary(opts, fetchImpl);

    expect(doc).toEqual({ id: "doc1", title: "Hi", markdown: "# hi" });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://example.com/api/convert");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(Blob);
  });

  it("strips a trailing slash from the base URL", async () => {
    const fetchImpl = fakeFetch(200, { id: "d", title: null, markdown: "" });
    await convertHtmlToLibrary({ ...opts, baseUrl: "https://example.com/" }, fetchImpl);
    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe("https://example.com/api/convert");
  });

  it("throws a needsLogin PlatformError on 401", async () => {
    const fetchImpl = fakeFetch(401, { error: "Unauthorized" });
    await expect(convertHtmlToLibrary(opts, fetchImpl)).rejects.toMatchObject({
      name: "PlatformError",
      status: 401,
      needsLogin: true,
    });
  });

  it("surfaces the server error message on other failures", async () => {
    const fetchImpl = fakeFetch(500, { error: "Conversion failed." });
    await expect(convertHtmlToLibrary(opts, fetchImpl)).rejects.toThrow("Conversion failed.");
    await expect(convertHtmlToLibrary(opts, fetchImpl)).rejects.toHaveProperty("needsLogin", false);
  });

  it("wraps a network failure as a PlatformError (status 0)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(convertHtmlToLibrary(opts, fetchImpl)).rejects.toMatchObject({
      name: "PlatformError",
      status: 0,
    });
  });
});

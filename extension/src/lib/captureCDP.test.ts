import { describe, it, expect, vi } from "vitest";
import { captureFullPageCDP, type CdpSession } from "./captureCDP";

/** A fake CdpSession that records calls and returns canned command responses. */
function fakeSession(
  responses: Record<string, unknown>,
  overrides: Partial<CdpSession> = {}
) {
  const calls: Array<{ method: string; params?: object }> = [];
  const attach = vi.fn(async () => {});
  const detach = vi.fn(async () => {});
  const send = vi.fn(async (method: string, params?: object) => {
    calls.push({ method, params });
    if (method in responses) return responses[method];
    return {};
  });
  const session: CdpSession = {
    attach,
    detach,
    send: send as unknown as CdpSession["send"],
    ...overrides,
  };
  return { session, calls, attach, detach, send };
}

const LAYOUT = { cssContentSize: { width: 1280, height: 8400 } };
const SHOT = { data: "QUJD" }; // base64 "ABC"

describe("captureFullPageCDP", () => {
  it("attaches, enables Page, reads layout, captures beyond viewport, returns a data URL", async () => {
    const { session, calls, attach, detach } = fakeSession({
      "Page.getLayoutMetrics": LAYOUT,
      "Page.captureScreenshot": SHOT,
    });

    const result = await captureFullPageCDP(session);

    expect(attach).toHaveBeenCalledOnce();
    expect(calls.map((c) => c.method)).toEqual([
      "Page.enable",
      "Page.getLayoutMetrics",
      "Page.captureScreenshot",
    ]);

    const shot = calls.find((c) => c.method === "Page.captureScreenshot")!;
    expect(shot.params).toMatchObject({
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 1280, height: 8400, scale: 1 },
    });

    expect(result).toEqual({
      dataUrl: "data:image/png;base64,QUJD",
      width: 1280,
      height: 8400,
    });
    expect(detach).toHaveBeenCalledOnce();
  });

  it("falls back to contentSize when cssContentSize is absent", async () => {
    const { session, calls } = fakeSession({
      "Page.getLayoutMetrics": { contentSize: { width: 800, height: 600 } },
      "Page.captureScreenshot": SHOT,
    });

    const result = await captureFullPageCDP(session);
    const shot = calls.find((c) => c.method === "Page.captureScreenshot")!;
    expect(shot.params).toMatchObject({ clip: { width: 800, height: 600 } });
    expect(result).toMatchObject({ width: 800, height: 600 });
  });

  it("always detaches, even when capture throws", async () => {
    const { session, detach } = fakeSession({
      "Page.getLayoutMetrics": LAYOUT,
    });
    // captureScreenshot returns {} → no data → throws.
    await expect(captureFullPageCDP(session)).rejects.toThrow(/empty screenshot/);
    expect(detach).toHaveBeenCalledOnce();
  });

  it("throws (and detaches) when the page has no content size", async () => {
    const { session, detach } = fakeSession({
      "Page.getLayoutMetrics": { cssContentSize: { width: 0, height: 0 } },
    });
    await expect(captureFullPageCDP(session)).rejects.toThrow(/no page content size/);
    expect(detach).toHaveBeenCalledOnce();
  });

  it("propagates an attach failure without sending commands or detaching", async () => {
    const attach = vi.fn(async () => {
      throw new Error("Cannot attach to this target");
    });
    const send = vi.fn();
    const detach = vi.fn(async () => {});
    const session: CdpSession = {
      attach,
      detach,
      send: send as unknown as CdpSession["send"],
    };

    await expect(captureFullPageCDP(session)).rejects.toThrow(/Cannot attach/);
    expect(send).not.toHaveBeenCalled();
    expect(detach).not.toHaveBeenCalled();
  });
});

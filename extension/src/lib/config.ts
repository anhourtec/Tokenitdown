/**
 * Platform configuration. The base URLs come exclusively from build-time env
 * (`import.meta.env.VITE_*`, sourced from the repo-root `.env`) — never hardcoded
 * here — so deploy targets are configured in one place. `host_permissions` in
 * `manifest.json` must list the same origins for the session cookie to be sent.
 */

/** Production platform origin (default). */
export const PLATFORM_BASE_URL = import.meta.env.VITE_TOKENITDOWN_BASE_URL;
/** Local dev platform origin, for testing against `npm run dev`. */
export const PLATFORM_DEV_URL = import.meta.env.VITE_TOKENITDOWN_DEV_URL;

/** Selectable targets shown in the popup, both sourced from env. */
export const PLATFORM_TARGETS: ReadonlyArray<{ label: string; url: string }> = [
  { label: "Production", url: PLATFORM_BASE_URL },
  { label: "Localhost", url: PLATFORM_DEV_URL },
];

const STORAGE_KEY = "platformBaseUrl";

/** The active base URL — the user's stored choice, else the production default. */
export async function getPlatformBaseUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return typeof value === "string" && value ? value : PLATFORM_BASE_URL;
}

export async function setPlatformBaseUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: url });
}

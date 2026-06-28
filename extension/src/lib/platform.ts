/**
 * Talks to the TokenItDown platform (`/api/convert`) to convert a page and save
 * it to the signed-in user's library. Auth is the user's existing better-auth
 * session: with `host_permissions` for the platform origin and
 * `credentials: "include"`, the browser attaches the session cookie to the
 * extension's cross-site request (verified — the `sameSite=lax` cookie reaches it).
 */

export interface SavedDocument {
  id: string;
  title: string | null;
  markdown: string;
}

/** A failure talking to the platform. `needsLogin` is set on 401 so the popup
 *  can prompt the user to sign in to the dashboard. */
export class PlatformError extends Error {
  status: number;
  needsLogin: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PlatformError";
    this.status = status;
    this.needsLogin = status === 401;
  }
}

/**
 * Uploads the page's rendered HTML to `{baseUrl}/api/convert` (markitdown
 * converts it and saves it to the library). Rendered HTML — not the URL — so the
 * live, hydrated DOM (SPA/auth-gated/dynamic content) is what gets converted.
 *
 * `fetchImpl` is injectable for tests; defaults to the global `fetch`.
 */
export async function convertHtmlToLibrary(
  opts: { baseUrl: string; html: string; filename: string },
  fetchImpl: typeof fetch = fetch
): Promise<SavedDocument> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([opts.html], { type: "text/html" }),
    opts.filename
  );

  const url = `${opts.baseUrl.replace(/\/+$/, "")}/api/convert`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch (err) {
    throw new PlatformError(
      `Could not reach TokenItDown at ${opts.baseUrl}: ${(err as Error).message}`,
      0
    );
  }

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    title?: string | null;
    markdown?: string;
    error?: string;
  };

  if (!res.ok) {
    const message =
      res.status === 401
        ? "Not signed in to TokenItDown — open the dashboard and log in, then try again."
        : body.error || `Conversion failed (${res.status}).`;
    throw new PlatformError(message, res.status);
  }

  return { id: body.id ?? "", title: body.title ?? null, markdown: body.markdown ?? "" };
}

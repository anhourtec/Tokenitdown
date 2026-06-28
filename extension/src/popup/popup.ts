import type { PopupMessage, RouteDecision, TokenStats, WorkerMessage } from "../types";

const captureBtn = document.getElementById("capture-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLDivElement;
const progressFill = document.getElementById("progress-fill") as HTMLDivElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const previewImg = document.getElementById("preview") as HTMLImageElement;
const downloadLink = document.getElementById("download-link") as HTMLAnchorElement;
const downloadMd = document.getElementById("download-md") as HTMLAnchorElement;
const routeBadge = document.getElementById("route-badge") as HTMLDivElement;
const tokenStats = document.getElementById("token-stats") as HTMLDivElement;
const errorEl = document.getElementById("error") as HTMLDivElement;

// Tracks the object URL backing the Markdown download so we can revoke it when
// a new capture replaces it, avoiding a leak across repeated captures.
let mdObjectUrl: string | null = null;

// Persistent connection to the service worker so we can receive progress events
const port = chrome.runtime.connect({ name: "popup" });

port.onMessage.addListener((msg: WorkerMessage) => {
  switch (msg.type) {
    case "CAPTURE_PROGRESS":
      setStatus(`Capturing frame ${msg.frame} of ${msg.total}…`);
      setProgress(msg.frame / msg.total);
      break;

    case "CAPTURE_DONE":
      showResult(msg.dataUrl, msg.markdown, msg.title, msg.route, msg.regions, msg.tokens);
      break;

    case "CAPTURE_ERROR":
      showError(msg.error);
      break;
  }
});

captureBtn.addEventListener("click", () => {
  startCapture();
});

function startCapture() {
  captureBtn.disabled = true;
  errorEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  statusEl.classList.remove("hidden");
  setStatus("Starting capture…");
  setProgress(0);

  send({ type: "START_CAPTURE" });
}

function showResult(
  dataUrl: string,
  markdown: string,
  title: string,
  route: RouteDecision,
  regions: number,
  tokens: TokenStats
) {
  statusEl.classList.add("hidden");
  captureBtn.disabled = false;

  previewImg.src = dataUrl;
  downloadLink.href = dataUrl;

  showRoute(route, regions);
  showTokens(tokens);

  // Back the Markdown download with a Blob object URL rather than a giant
  // data: URL — more memory-efficient for long pages. Revoke the previous one.
  if (mdObjectUrl) URL.revokeObjectURL(mdObjectUrl);
  mdObjectUrl = URL.createObjectURL(
    new Blob([markdown], { type: "text/markdown" })
  );
  downloadMd.href = mdObjectUrl;
  downloadMd.download = `${slugify(title) || "page"}.md`;

  resultEl.classList.remove("hidden");
}

/** Labels for each route path, shown as a badge so the user sees which pipeline
 *  produced the Markdown. */
const ROUTE_LABELS: Record<RouteDecision["path"], string> = {
  dom: "DOM",
  vision: "Vision",
  hybrid: "Hybrid",
};

/** Renders the router's decision as a colored badge with a tooltip explaining why.
 *  On hybrid pages it also notes how many visual regions were described inline. */
function showRoute(route: RouteDecision, regions: number) {
  const suffix = regions > 0 ? ` · ${regions} region${regions === 1 ? "" : "s"}` : "";
  routeBadge.textContent = `${ROUTE_LABELS[route.path]} path${suffix}`;
  routeBadge.title = route.reason;
  routeBadge.dataset.path = route.path;
  routeBadge.classList.remove("hidden");
}

/** Shows the output token estimate and, when the clean stage trimmed anything,
 *  how much was saved. Counts are estimates (~4 chars/token), hence the `≈`. */
function showTokens(tokens: TokenStats) {
  const after = tokens.after.toLocaleString();
  tokenStats.textContent =
    tokens.saved > 0
      ? `≈ ${after} tokens · −${tokens.savedPct}% after cleaning`
      : `≈ ${after} tokens`;
  tokenStats.classList.remove("hidden");
}

/** Turns a page title into a safe, lowercase filename stem. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function showError(message: string) {
  statusEl.classList.add("hidden");
  captureBtn.disabled = false;

  errorEl.textContent = `Error: ${message}`;
  errorEl.classList.remove("hidden");
}

function setStatus(text: string) {
  statusText.textContent = text;
}

function setProgress(ratio: number) {
  progressFill.style.width = `${Math.round(ratio * 100)}%`;
}

function send(msg: PopupMessage) {
  port.postMessage(msg);
}

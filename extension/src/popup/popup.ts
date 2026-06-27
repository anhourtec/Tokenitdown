import type { PopupMessage, WorkerMessage } from "../types";

const captureBtn = document.getElementById("capture-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLDivElement;
const progressFill = document.getElementById("progress-fill") as HTMLDivElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const previewImg = document.getElementById("preview") as HTMLImageElement;
const downloadLink = document.getElementById("download-link") as HTMLAnchorElement;
const errorEl = document.getElementById("error") as HTMLDivElement;

// Persistent connection to the service worker so we can receive progress events
const port = chrome.runtime.connect({ name: "popup" });

port.onMessage.addListener((msg: WorkerMessage) => {
  switch (msg.type) {
    case "CAPTURE_PROGRESS":
      setStatus(`Capturing frame ${msg.frame} of ${msg.total}…`);
      setProgress(msg.frame / msg.total);
      break;

    case "CAPTURE_DONE":
      showResult(msg.dataUrl);
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

function showResult(dataUrl: string) {
  statusEl.classList.add("hidden");
  captureBtn.disabled = false;

  previewImg.src = dataUrl;
  downloadLink.href = dataUrl;
  resultEl.classList.remove("hidden");
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

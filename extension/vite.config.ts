import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  // Read env from the repo root so the extension build picks up the shared
  // `.env` (only VITE_-prefixed vars are exposed to the bundle).
  envDir: "..",
  plugins: [
    webExtension({
      manifest: "manifest.json",
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});

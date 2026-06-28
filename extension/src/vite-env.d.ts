// Build-time env exposed to the extension bundle by Vite (VITE_-prefixed only).
// Values come from the repo-root `.env` (see `.env.example`).
interface ImportMetaEnv {
  /** Platform origin the extension talks to (production). */
  readonly VITE_TOKENITDOWN_BASE_URL: string;
  /** Local dev platform origin, for testing against `npm run dev`. */
  readonly VITE_TOKENITDOWN_DEV_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

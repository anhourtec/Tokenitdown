import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    // PostgreSQL connection string used by Drizzle (lib/db) and better-auth.
    DATABASE_URL: z.string().url(),
    // Secret used by better-auth to sign session cookies / tokens. Must be a
    // long random string (e.g. `openssl rand -base64 32`). Required in all envs.
    BETTER_AUTH_SECRET: z.string().min(32),
    // Public base URL of this deployment, used by better-auth for callbacks and
    // trusted-origin / CSRF checks. e.g. http://localhost:3000 in dev.
    BETTER_AUTH_URL: z.string().url(),
    // Redis connection string — reserved for the job queue (BullMQ) and a future
    // session store. Optional for the auth baseline (sessions live in Postgres).
    REDIS_URL: z.string().url().optional(),
    // Extra comma-separated origins allowed by better-auth (CSRF / trusted
    // origins) beyond BETTER_AUTH_URL. In dev the LAN URL is auto-added so
    // others on your network can sign in. e.g. "http://192.168.1.20:3000".
    TRUSTED_ORIGINS: z.string().optional(),
    // Base URL of the internal Python MarkItDown processing service. Inside
    // docker-compose this is http://markitdown:8000; locally http://localhost:8000.
    MARKITDOWN_SERVICE_URL: z.string().url().default("http://localhost:8000"),
    // Shared secret sent as X-Service-Token to the processing service. Must match
    // the service's MARKITDOWN_SERVICE_TOKEN. Generate: `openssl rand -base64 24`.
    MARKITDOWN_SERVICE_TOKEN: z.string().min(16),
    // Directory where original uploaded files are stored (per-user subfolders).
    // A mounted volume in Docker; a local path in dev.
    STORAGE_DIR: z.string().default("./data/uploads"),
    // Max upload size accepted by the convert API, in bytes (default 50 MB).
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52428800),
    // Base URL of the internal docs (Nextra) container. When set, the app proxies
    // /docs/* to it so docs are served at the same origin (ip:PORT/docs). Inside
    // docker-compose this is http://docs:3000; unset locally unless you run docs.
    DOCS_INTERNAL_URL: z.string().url().optional(),
  },
  client: {
    // Base URL the browser auth client talks to. Defaults to the current origin
    // when unset, so it is optional.
    NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    REDIS_URL: process.env.REDIS_URL,
    TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
    MARKITDOWN_SERVICE_URL: process.env.MARKITDOWN_SERVICE_URL,
    MARKITDOWN_SERVICE_TOKEN: process.env.MARKITDOWN_SERVICE_TOKEN,
    STORAGE_DIR: process.env.STORAGE_DIR,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    DOCS_INTERNAL_URL: process.env.DOCS_INTERNAL_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  // Allow `npm run build` / drizzle-kit and CI to run without a full env.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})

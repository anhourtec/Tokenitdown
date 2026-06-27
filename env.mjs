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
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  },
  // Allow `npm run build` / drizzle-kit and CI to run without a full env.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})

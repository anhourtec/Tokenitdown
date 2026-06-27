import { defineConfig } from "drizzle-kit"

import { env } from "./env.mjs"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  // Snake-casing is off: better-auth expects the camelCase column names declared
  // in schema.ts.
  casing: "camelCase",
  verbose: true,
  strict: true,
})

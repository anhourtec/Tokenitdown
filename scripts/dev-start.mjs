#!/usr/bin/env node

/**
 * Dev startup: make sure the database exists and all migrations are applied,
 * then start the Next.js dev server. Mirrors the BookYourPTO-SaaS dev flow so
 * the schema is never out of date when you `npm run dev`.
 *
 * Env is loaded by the npm script via `node --env-file-if-exists=.env`.
 */
import { execSync } from "node:child_process"

import { ensureDatabase } from "./ensure-db.mjs"

async function main() {
  console.log("========================================")
  console.log("  TokenItDown — dev server")
  console.log("========================================")

  console.log("\n▶ Ensuring database + applying migrations...")
  await ensureDatabase()
  execSync("node node_modules/drizzle-kit/bin.cjs migrate", { stdio: "inherit" })
  console.log("✓ Database ready.\n")

  console.log("▶ Starting Next.js dev server...\n")
  // node_modules/.bin is on PATH when invoked via npm run.
  execSync("next dev --turbo", { stdio: "inherit" })
}

main().catch((error) => {
  console.error(`\n✗ Dev startup failed: ${error.message}`)
  console.error("  Is the database reachable? Check DATABASE_URL in .env and that ./deploy.sh has run on the server.")
  process.exit(1)
})

#!/usr/bin/env node

/**
 * Production container startup (mirrors BookYourPTO-SaaS's docker-deploy flow):
 *   1. wait for Postgres to be reachable
 *   2. ensure the database + schema exist (create DB, run Drizzle migrations)
 *   3. validate required runtime env in production (fail fast with clear errors)
 *   4. start Next.js
 *
 * Skip migrations with SKIP_MIGRATIONS=true (e.g. when CI/CD runs them).
 */
import { execSync } from "node:child_process"

import pg from "pg"

import { ensureDatabase } from "./ensure-db.mjs"

const { Client } = pg
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
}
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`)

function useSSL() {
  return process.env.DB_SSL !== "false" && process.env.NODE_ENV === "production"
}

async function waitForServer(maxAttempts = 30) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")

  // Probe the always-present maintenance DB so this works before the target
  // database is created.
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = "/postgres"

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = new Client({
        connectionString: adminUrl.toString(),
        ...(useSSL() && { ssl: { rejectUnauthorized: false } }),
      })
      await client.connect()
      await client.query("SELECT 1")
      await client.end()
      log("✓ Postgres is reachable.", colors.green)
      return
    } catch (error) {
      if (attempt === 1) log(`Connecting to ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`, colors.yellow)
      log(`Attempt ${attempt}/${maxAttempts} — Postgres not ready: ${error.message}`, colors.yellow)
      if (attempt === maxAttempts) throw new Error(`Postgres not reachable after ${maxAttempts} attempts`)
      await sleep(2000)
    }
  }
}

/**
 * Validate the env the app needs at runtime. Failing here gives a clear error
 * up front instead of a 500 on the first authenticated request.
 */
function validateEnv() {
  const missing = []
  const check = (name, ok, reason) => {
    if (ok) log(`✓ ${name} configured`, colors.green)
    else missing.push({ name, reason })
  }

  check("DATABASE_URL", Boolean(process.env.DATABASE_URL), "the app cannot reach the database")
  check(
    "BETTER_AUTH_SECRET",
    typeof process.env.BETTER_AUTH_SECRET === "string" && process.env.BETTER_AUTH_SECRET.length >= 32,
    "must be a random string of at least 32 chars — sessions/auth will fail"
  )
  check("BETTER_AUTH_URL", Boolean(process.env.BETTER_AUTH_URL), "auth callbacks / CSRF checks need the public URL")

  if (!process.env.REDIS_URL) {
    log("⚠ REDIS_URL not set — fine for the auth baseline (sessions live in Postgres).", colors.yellow)
  }

  if (missing.length > 0) {
    log("\n✗ CRITICAL: required environment variables are missing/invalid:", colors.red)
    for (const m of missing) log(`  - ${m.name}: ${m.reason}`, colors.red)
    log("\nSet them in .env and re-run ./deploy.sh.\n", colors.red)
    throw new Error(`${missing.length} required env var(s) missing`)
  }
}

async function main() {
  log("========================================", colors.blue)
  log("  TokenItDown — container startup", colors.blue)
  log("========================================", colors.blue)

  validateEnv()
  await waitForServer()

  if (process.env.SKIP_MIGRATIONS === "true") {
    log("⏭ Skipping migrations (SKIP_MIGRATIONS=true)", colors.yellow)
  } else {
    await ensureDatabase()
    log("Applying Drizzle migrations...", colors.blue)
    execSync("npx drizzle-kit migrate", { stdio: "inherit" })
    log("✓ Migrations applied.", colors.green)
  }

  const port = process.env.PORT ?? "3000"
  log(`\nStarting Next.js on port ${port}...`, colors.green)
  execSync(`npx next start -p ${port}`, { stdio: "inherit" })
}

main().catch((error) => {
  log(`\n✗ Startup failed: ${error.message}`, colors.red)
  process.exit(1)
})

#!/usr/bin/env node

/**
 * Dev startup: make sure the database exists and all migrations are applied,
 * then start the Next.js dev server. Mirrors the BookYourPTO-SaaS dev flow so
 * the schema is never out of date when you `npm run dev`.
 *
 * Env is loaded by the npm script via `node --env-file-if-exists=.env`.
 */
import { execSync } from "node:child_process"
import { networkInterfaces } from "node:os"

import { ensureDatabase } from "./ensure-db.mjs"

/** First non-internal IPv4 address (the LAN IP), or null. */
function getLanIp() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address
    }
  }
  return null
}

async function main() {
  console.log("========================================")
  console.log("  TokenItDown — dev server")
  console.log("========================================")

  console.log("\n▶ Ensuring database + applying migrations...")
  await ensureDatabase()
  execSync("node node_modules/drizzle-kit/bin.cjs migrate", { stdio: "inherit" })
  console.log("✓ Database ready.\n")

  // Make the LAN URL a trusted origin so others on the network can sign in
  // (better-auth blocks cross-origin POSTs otherwise).
  const port = process.env.PORT ?? "3000"
  const lanIp = getLanIp()
  if (lanIp) {
    const lanUrl = `http://${lanIp}:${port}`
    const existing = process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : []
    if (!existing.includes(lanUrl)) {
      process.env.TRUSTED_ORIGINS = [...existing, lanUrl].filter(Boolean).join(",")
    }
    console.log(`▶ Starting Next.js dev server — share on your network: ${lanUrl}\n`)
  } else {
    console.log("▶ Starting Next.js dev server (LAN-accessible on 0.0.0.0)...\n")
  }

  // -H 0.0.0.0 binds all interfaces so others on your network can reach it at
  // http://<your-lan-ip>:<port> (like Nuxt's `npm run dev --host`).
  // node_modules/.bin is on PATH when invoked via npm run.
  execSync("next dev --turbo -H 0.0.0.0", { stdio: "inherit" })
}

main().catch((error) => {
  console.error(`\n✗ Dev startup failed: ${error.message}`)
  console.error("  Is the database reachable? Check DATABASE_URL in .env and that ./deploy.sh has run on the server.")
  process.exit(1)
})

#!/usr/bin/env node

/**
 * Ensures the target Postgres database (from DATABASE_URL) exists, creating it
 * if missing. Needed because we connect to a shared Postgres server (on
 * 192.168.69.16) that is NOT managed by this project's docker-compose — the
 * `tokenitdown` database has to be provisioned on first deploy.
 *
 * Connects to the server's default `postgres` database to run CREATE DATABASE.
 * Safe to run repeatedly (no-op when the database already exists).
 */
import pg from "pg"

const { Client } = pg

function useSSL() {
  return process.env.DB_SSL !== "false" && process.env.NODE_ENV === "production"
}

/**
 * Parses a Postgres connection string into the target database name and the URL
 * of the maintenance (`postgres`) database used to create it. Validates the
 * database name because CREATE DATABASE cannot be parameterized.
 *
 * @param {string} databaseUrl
 * @returns {{ targetDb: string, adminUrl: string }}
 */
export function resolveTargetDatabase(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set")
  }

  const url = new URL(databaseUrl)
  const targetDb = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!targetDb) {
    throw new Error(`DATABASE_URL has no database name: ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`)
  }
  // Postgres identifiers are limited; guard against injection in the
  // non-parameterizable CREATE DATABASE statement.
  if (!/^[A-Za-z0-9_]+$/.test(targetDb)) {
    throw new Error(`Unsafe database name: ${targetDb}`)
  }

  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = "/postgres"

  return { targetDb, adminUrl: adminUrl.toString() }
}

export async function ensureDatabase() {
  const { targetDb, adminUrl } = resolveTargetDatabase(process.env.DATABASE_URL)

  // Connect to the maintenance database to check/create the target.
  const client = new Client({
    connectionString: adminUrl,
    ...(useSSL() && { ssl: { rejectUnauthorized: false } }),
  })

  await client.connect()
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb])
    if (rowCount === 0) {
      console.log(`[ensure-db] Creating database "${targetDb}"...`)
      await client.query(`CREATE DATABASE "${targetDb}"`)
      console.log(`[ensure-db] Database "${targetDb}" created.`)
    } else {
      console.log(`[ensure-db] Database "${targetDb}" already exists.`)
    }
  } finally {
    await client.end()
  }
}

// Run directly: `node scripts/ensure-db.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureDatabase().catch((error) => {
    console.error(`[ensure-db] Failed: ${error.message}`)
    process.exit(1)
  })
}

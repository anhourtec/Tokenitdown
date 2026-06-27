import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { schema } from "./schema"
import { env } from "../../env.mjs"

/**
 * Drizzle client backed by a node-postgres pool.
 *
 * The pool is cached on `globalThis` so Next.js dev HMR doesn't open a new pool
 * (and exhaust Postgres connections) on every reload.
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool
}

export const db = drizzle(pool, { schema })

export { schema }

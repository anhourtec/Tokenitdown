import { and, count, desc, eq, isNotNull, isNull, sum } from "drizzle-orm"
import { createHash, randomBytes, randomUUID } from "crypto"


import { db, schema } from "./db"

import type { CleanStats } from "./markdown/clean"

/**
 * Per-user API keys for the MCP server / programmatic access.
 *
 * A token looks like `tid_<base64url secret>`. We never store the token — only
 * its SHA-256 hash (lookup key) and last four chars (for display). Because the
 * secret is high-entropy random, a plain SHA-256 is the right primitive here
 * (unlike passwords, no salt/bcrypt is needed). The Python MCP server validates
 * a presented token by POSTing it to /api/mcp/verify, which calls `verifyApiKey`.
 */

const PREFIX = "tid_"

export interface ApiKeySummary {
  id: string
  name: string
  /** Masked display form, e.g. `tid_…a1b2`. */
  masked: string
  createdAt: Date
  lastUsedAt: Date | null
}

export interface ApiKeyWithUsage extends ApiKeySummary {
  /** Number of conversions this key (agent) has performed. */
  calls: number
  /** Total tokens saved by cleaning across this key's conversions. */
  tokensSaved: number
}

/** SHA-256 hex of the full token. */
export function hashKey(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Mint a fresh token + its stored derivatives. The token is returned once. */
export function generateApiKey(): { token: string; keyHash: string; lastFour: string } {
  const secret = randomBytes(24).toString("base64url")
  const token = `${PREFIX}${secret}`
  return { token, keyHash: hashKey(token), lastFour: secret.slice(-4) }
}

function masked(lastFour: string): string {
  return `${PREFIX}…${lastFour}`
}

function toSummary(row: {
  id: string
  name: string
  lastFour: string
  createdAt: Date
  lastUsedAt: Date | null
}): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    masked: masked(row.lastFour),
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }
}

/** List a user's active (non-revoked) keys, newest first. Never returns secrets. */
export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  const rows = await db
    .select({
      id: schema.apiKey.id,
      name: schema.apiKey.name,
      lastFour: schema.apiKey.lastFour,
      createdAt: schema.apiKey.createdAt,
      lastUsedAt: schema.apiKey.lastUsedAt,
    })
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.userId, userId), isNull(schema.apiKey.revokedAt)))
    .orderBy(desc(schema.apiKey.createdAt))
  return rows.map(toSummary)
}

/**
 * Create a key for `userId`. Returns the full token EXACTLY ONCE (the caller must
 * surface it to the user immediately; it can never be retrieved again).
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ token: string; key: ApiKeySummary }> {
  const { token, keyHash, lastFour } = generateApiKey()
  const id = randomUUID()
  const createdAt = new Date()
  await db.insert(schema.apiKey).values({ id, userId, name, keyHash, lastFour, createdAt })
  return { token, key: toSummary({ id, name, lastFour, createdAt, lastUsedAt: null }) }
}

/** Revoke a key the user owns. Returns true if a row was revoked. */
export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const revoked = await db
    .update(schema.apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKey.id, id), eq(schema.apiKey.userId, userId), isNull(schema.apiKey.revokedAt)))
    .returning({ id: schema.apiKey.id })
  return revoked.length > 0
}

/**
 * Validate a presented token. Returns the owning userId + key id for an active
 * key, else null. Touches `lastUsedAt` on success. Used by the internal
 * /api/mcp/verify route and by the convert routes (to tag documents).
 */
export async function verifyApiKey(token: string): Promise<{ userId: string; apiKeyId: string } | null> {
  if (!token || !token.startsWith(PREFIX)) return null
  const keyHash = hashKey(token)
  const rows = await db
    .select({ id: schema.apiKey.id, userId: schema.apiKey.userId })
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.keyHash, keyHash), isNull(schema.apiKey.revokedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  await db.update(schema.apiKey).set({ lastUsedAt: new Date() }).where(eq(schema.apiKey.id, row.id))
  return { userId: row.userId, apiKeyId: row.id }
}

/**
 * Active keys plus their usage — number of conversions and total tokens saved —
 * computed from the documents each key created. Powers the dashboard's per-key
 * transparency view.
 */
export async function listApiKeysWithUsage(userId: string): Promise<ApiKeyWithUsage[]> {
  const keys = await listApiKeys(userId)
  if (keys.length === 0) return []

  const usageRows = await db
    .select({
      apiKeyId: schema.document.apiKeyId,
      calls: count(),
      rawTokens: sum(schema.document.rawTokens),
      cleanTokens: sum(schema.document.cleanTokens),
    })
    .from(schema.document)
    .where(and(eq(schema.document.userId, userId), isNotNull(schema.document.apiKeyId)))
    .groupBy(schema.document.apiKeyId)

  const byKey = new Map(usageRows.map((u) => [u.apiKeyId, u]))
  return keys.map((k) => {
    const u = byKey.get(k.id)
    const raw = Number(u?.rawTokens ?? 0)
    const clean = Number(u?.cleanTokens ?? 0)
    return { ...k, calls: Number(u?.calls ?? 0), tokensSaved: Math.max(0, raw - clean) }
  })
}

export interface KeyConversion {
  id: string
  title: string
  sourceType: string
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  cleanTier: string
  cleanStats: CleanStats | null
  rawTokens: number
  cleanTokens: number
  createdAt: Date
}

/** Recent conversions performed by one of the user's keys (newest first). */
export async function listKeyConversions(
  userId: string,
  apiKeyId: string,
  limit = 20
): Promise<KeyConversion[]> {
  return db
    .select({
      id: schema.document.id,
      title: schema.document.title,
      sourceType: schema.document.sourceType,
      sourceName: schema.document.sourceName,
      mimetype: schema.document.mimetype,
      sizeBytes: schema.document.sizeBytes,
      cleanTier: schema.document.cleanTier,
      cleanStats: schema.document.cleanStats,
      rawTokens: schema.document.rawTokens,
      cleanTokens: schema.document.cleanTokens,
      createdAt: schema.document.createdAt,
    })
    .from(schema.document)
    .where(and(eq(schema.document.userId, userId), eq(schema.document.apiKeyId, apiKeyId)))
    .orderBy(desc(schema.document.createdAt))
    .limit(limit)
}

/**
 * Resolve the user behind a request: an `Authorization: Bearer tid_…` API key if
 * present and valid, otherwise the logged-in session. Returns the userId and the
 * apiKeyId (null for session/dashboard callers) so callers can tag what they create.
 */
export async function resolveRequestUser(
  req: Request,
  getSessionUserId: () => Promise<string | null>
): Promise<{ userId: string; apiKeyId: string | null } | null> {
  const authz = req.headers.get("authorization")
  if (authz?.startsWith("Bearer ")) {
    const token = authz.slice(7).trim()
    if (token.startsWith(PREFIX)) {
      const result = await verifyApiKey(token)
      if (result) return { userId: result.userId, apiKeyId: result.apiKeyId }
      return null // a bearer key was presented but is invalid — don't fall back
    }
  }
  const userId = await getSessionUserId()
  return userId ? { userId, apiKeyId: null } : null
}

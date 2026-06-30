import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * better-auth core schema (email/password + sessions).
 *
 * Column names mirror better-auth's default field names so the Drizzle adapter
 * maps to them without extra configuration. Regenerate with
 * `npx @better-auth/cli generate` if the auth plugins change.
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

/**
 * Converted documents. Each row is one MarkItDown conversion belonging to a user:
 * the resulting Markdown plus metadata about the source. The original file (when
 * the source was an upload) is stored on disk at `storagePath` (under STORAGE_DIR).
 */
export const document = pgTable(
  "document",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // "file" (uploaded) or "url" (web page / YouTube).
    sourceType: text("sourceType").notNull(),
    // Original filename or the source URL.
    sourceName: text("sourceName").notNull(),
    mimetype: text("mimetype"),
    sizeBytes: integer("sizeBytes").notNull().default(0),
    // Relative path of the stored original under STORAGE_DIR; null for URL sources.
    storagePath: text("storagePath"),
    // Cleaned, LLM-ready Markdown (what we serve by default).
    markdown: text("markdown").notNull(),
    // Raw engine output before the cleaning pass — kept so we can re-process
    // without re-converting. Null for older rows created before cleaning existed.
    markdownRaw: text("markdownRaw"),
    // Which cleaning tier produced `markdown`: "raw" | "clean" | "compact".
    cleanTier: text("cleanTier").notNull().default("clean"),
    // Estimated token counts before/after cleaning (the "tokens saved" metric).
    rawTokens: integer("rawTokens").notNull().default(0),
    cleanTokens: integer("cleanTokens").notNull().default(0),
    // Per-transform counts from the cleaning pass (what was eliminated), for
    // transparency in the UI. Shape mirrors CleanStats in lib/markdown/clean.ts.
    cleanStats: jsonb("cleanStats"),
    // The API key that created this document when it came from an AI agent via the
    // MCP server; null for conversions made in the dashboard. Logically references
    // api_key.id (keys are revoked, never deleted, so no hard FK is needed). This
    // is what powers the per-key "what did this agent convert" transparency view.
    apiKeyId: text("apiKeyId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("document_userId_idx").on(table.userId),
    index("document_apiKeyId_idx").on(table.apiKeyId),
  ]
)

/**
 * Per-user preferences (1:1 with user). Defaults applied in lib/preferences.ts
 * when no row exists yet.
 */
export const userPreference = pgTable("user_preference", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // Default cleaning tier for conversions: "clean" | "compact".
  defaultCleanTier: text("defaultCleanTier").notNull().default("clean"),
  // Default RAG chunk granularity: "auto" | "1" | "2" | "3".
  defaultChunkLevel: text("defaultChunkLevel").notNull().default("auto"),
  // Whether to keep the original uploaded file on disk after conversion.
  storeOriginals: boolean("storeOriginals").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/**
 * Per-user API keys for the MCP server / programmatic access. The full token is
 * shown to the user exactly once at creation; we persist only its SHA-256 hash
 * (`keyHash`) and the last four chars (`lastFour`) for display. The Python MCP
 * server validates a presented bearer token via /api/mcp/verify, which looks the
 * hash up here. Revoking sets `revokedAt` (rows are kept for audit).
 */
export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // User-supplied label, e.g. "laptop" or "CI".
    name: text("name").notNull(),
    // SHA-256 hex of the full token; the token itself is never stored.
    keyHash: text("keyHash").notNull().unique(),
    // Last four chars of the token's secret, for display (tid_…abcd).
    lastFour: text("lastFour").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    lastUsedAt: timestamp("lastUsedAt"),
    // Set when revoked; a non-null value disables the key.
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [index("api_key_userId_idx").on(table.userId), index("api_key_keyHash_idx").on(table.keyHash)]
)

export const schema = { user, session, account, verification, document, userPreference, apiKey }

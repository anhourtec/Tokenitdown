import { eq } from "drizzle-orm"

import { db, schema } from "./db"

export type CleanTierPref = "clean" | "compact"
export type ChunkLevelPref = "auto" | "1" | "2" | "3"

export interface UserPreferences {
  defaultCleanTier: CleanTierPref
  defaultChunkLevel: ChunkLevelPref
  storeOriginals: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCleanTier: "clean",
  defaultChunkLevel: "auto",
  storeOriginals: true,
}

function coerce(row: { defaultCleanTier: string; defaultChunkLevel: string; storeOriginals: boolean }): UserPreferences {
  return {
    defaultCleanTier: row.defaultCleanTier === "compact" ? "compact" : "clean",
    defaultChunkLevel: (["auto", "1", "2", "3"] as const).includes(row.defaultChunkLevel as ChunkLevelPref)
      ? (row.defaultChunkLevel as ChunkLevelPref)
      : "auto",
    storeOriginals: row.storeOriginals !== false,
  }
}

/** Resolve a user's preferences, falling back to defaults when no row exists. */
export async function getPreferences(userId: string): Promise<UserPreferences> {
  const rows = await db.select().from(schema.userPreference).where(eq(schema.userPreference.userId, userId))
  const row = rows[0]
  return row ? coerce(row) : { ...DEFAULT_PREFERENCES }
}

/** Validate + upsert a partial preferences update; returns the merged result. */
export async function updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const current = await getPreferences(userId)
  const next = coerce({ ...current, ...patch })

  await db
    .insert(schema.userPreference)
    .values({ userId, ...next })
    .onConflictDoUpdate({
      target: schema.userPreference.userId,
      set: { ...next, updatedAt: new Date() },
    })

  return next
}

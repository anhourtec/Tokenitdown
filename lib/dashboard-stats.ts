import { and, count, desc, eq, gte, sql } from "drizzle-orm"

import { db, schema } from "./db"

const doc = schema.document

export interface DashboardDailyPoint {
  /** ISO date, "YYYY-MM-DD". */
  date: string
  conversions: number
  tokensSaved: number
}

export interface DashboardFormatSlice {
  sourceType: string
  count: number
}

export interface DashboardRecentItem {
  id: string
  title: string
  sourceType: string
  sourceName: string
  rawTokens: number
  cleanTokens: number
  fromAgent: boolean
  createdAt: Date
}

export interface DashboardTopSaver {
  id: string
  title: string
  saved: number
}

export interface DashboardStats {
  documents: number
  rawTokens: number
  cleanTokens: number
  tokensSaved: number
  /** Percent reduction across all conversions (0–100). */
  reductionPct: number
  storedBytes: number
  agentConversions: number
  daily: DashboardDailyPoint[]
  byFormat: DashboardFormatSlice[]
  recent: DashboardRecentItem[]
  topSavers: DashboardTopSaver[]
}

const DAYS = 30

/** Aggregate a user's conversion activity for the dashboard. */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const since = new Date(Date.now() - (DAYS - 1) * 24 * 60 * 60 * 1000)
  since.setHours(0, 0, 0, 0)

  const [totalsRow] = await db
    .select({
      documents: count(),
      rawTokens: sql<string>`coalesce(sum(${doc.rawTokens}), 0)`,
      cleanTokens: sql<string>`coalesce(sum(${doc.cleanTokens}), 0)`,
      storedBytes: sql<string>`coalesce(sum(${doc.sizeBytes}), 0)`,
      agentConversions: sql<string>`coalesce(sum(case when ${doc.apiKeyId} is not null then 1 else 0 end), 0)`,
    })
    .from(doc)
    .where(eq(doc.userId, userId))

  const byFormatRows = await db
    .select({ sourceType: doc.sourceType, count: count() })
    .from(doc)
    .where(eq(doc.userId, userId))
    .groupBy(doc.sourceType)
    .orderBy(desc(count()))

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${doc.createdAt}), 'YYYY-MM-DD')`,
      conversions: count(),
      tokensSaved: sql<string>`coalesce(sum(${doc.rawTokens} - ${doc.cleanTokens}), 0)`,
    })
    .from(doc)
    .where(and(eq(doc.userId, userId), gte(doc.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${doc.createdAt})`)

  const recentRows = await db
    .select({
      id: doc.id,
      title: doc.title,
      sourceType: doc.sourceType,
      sourceName: doc.sourceName,
      rawTokens: doc.rawTokens,
      cleanTokens: doc.cleanTokens,
      apiKeyId: doc.apiKeyId,
      createdAt: doc.createdAt,
    })
    .from(doc)
    .where(eq(doc.userId, userId))
    .orderBy(desc(doc.createdAt))
    .limit(6)

  const topSaverRows = await db
    .select({
      id: doc.id,
      title: doc.title,
      saved: sql<string>`${doc.rawTokens} - ${doc.cleanTokens}`,
    })
    .from(doc)
    .where(eq(doc.userId, userId))
    .orderBy(desc(sql`${doc.rawTokens} - ${doc.cleanTokens}`))
    .limit(5)

  const rawTokens = Number(totalsRow?.rawTokens ?? 0)
  const cleanTokens = Number(totalsRow?.cleanTokens ?? 0)
  const tokensSaved = Math.max(0, rawTokens - cleanTokens)

  // Build a continuous DAYS-long series so the chart never has gaps.
  const byDay = new Map(dailyRows.map((r) => [r.day, r]))
  const daily: DashboardDailyPoint[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const row = byDay.get(key)
    return {
      date: key,
      conversions: row ? Number(row.conversions) : 0,
      tokensSaved: row ? Number(row.tokensSaved) : 0,
    }
  })

  return {
    documents: Number(totalsRow?.documents ?? 0),
    rawTokens,
    cleanTokens,
    tokensSaved,
    reductionPct: rawTokens > 0 ? Math.round((tokensSaved / rawTokens) * 100) : 0,
    storedBytes: Number(totalsRow?.storedBytes ?? 0),
    agentConversions: Number(totalsRow?.agentConversions ?? 0),
    daily,
    byFormat: byFormatRows.map((r) => ({ sourceType: r.sourceType, count: Number(r.count) })),
    recent: recentRows.map((r) => ({
      id: r.id,
      title: r.title,
      sourceType: r.sourceType,
      sourceName: r.sourceName,
      rawTokens: r.rawTokens,
      cleanTokens: r.cleanTokens,
      fromAgent: r.apiKeyId != null,
      createdAt: r.createdAt,
    })),
    topSavers: topSaverRows
      .map((r) => ({ id: r.id, title: r.title, saved: Number(r.saved) }))
      .filter((r) => r.saved > 0),
  }
}

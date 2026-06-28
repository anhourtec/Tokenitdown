import { desc, eq } from "drizzle-orm"

import { randomUUID } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { db, schema } from "./db"
import type { CleanStats } from "./markdown/clean"
import { buildStoragePath, resolveStoredFile, safeExtension } from "./storage-path"

import { env } from "../env.mjs"

export type SourceType = "file" | "url"

export interface DocumentRecord {
  id: string
  userId: string
  title: string
  sourceType: SourceType
  sourceName: string
  mimetype: string | null
  sizeBytes: number
  storagePath: string | null
  markdown: string
  markdownRaw: string | null
  cleanTier: string
  rawTokens: number
  cleanTokens: number
  cleanStats: CleanStats | null
  createdAt: Date
}

/** Absolute path on disk for a stored original (rooted at STORAGE_DIR). */
function storedFile(storagePath: string): string {
  return resolveStoredFile(env.STORAGE_DIR, storagePath)
}

interface SaveDocumentInput {
  userId: string
  title: string | null | undefined
  sourceType: SourceType
  sourceName: string
  mimetype?: string | null
  markdown: string
  /** Raw engine output before cleaning (kept for re-processing). */
  markdownRaw?: string | null
  cleanTier?: string
  rawTokens?: number
  cleanTokens?: number
  cleanStats?: CleanStats | null
  /** Original bytes to persist on disk (uploads only). */
  original?: { bytes: Buffer; filename: string } | null
}

/**
 * Persist a conversion: write the original file to disk (if provided) and insert
 * the document row. Returns the saved record.
 */
export async function saveDocument(input: SaveDocumentInput): Promise<DocumentRecord> {
  const id = randomUUID()
  let storagePath: string | null = null
  let sizeBytes = 0

  if (input.original) {
    const ext = safeExtension(input.original.filename)
    storagePath = buildStoragePath(input.userId, id, ext)
    const abs = storedFile(storagePath)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, input.original.bytes)
    sizeBytes = input.original.bytes.byteLength
  }

  const title = (input.title?.trim() || input.sourceName).slice(0, 500)

  const [row] = await db
    .insert(schema.document)
    .values({
      id,
      userId: input.userId,
      title,
      sourceType: input.sourceType,
      sourceName: input.sourceName.slice(0, 2000),
      mimetype: input.mimetype ?? null,
      sizeBytes,
      storagePath,
      markdown: input.markdown,
      markdownRaw: input.markdownRaw ?? null,
      cleanTier: input.cleanTier ?? "clean",
      rawTokens: input.rawTokens ?? 0,
      cleanTokens: input.cleanTokens ?? 0,
      cleanStats: input.cleanStats ?? null,
    })
    .returning()

  return row as DocumentRecord
}

/** List a user's documents, newest first. Markdown is omitted to keep it light. */
export async function listDocuments(userId: string) {
  return db
    .select({
      id: schema.document.id,
      title: schema.document.title,
      sourceType: schema.document.sourceType,
      sourceName: schema.document.sourceName,
      mimetype: schema.document.mimetype,
      sizeBytes: schema.document.sizeBytes,
      rawTokens: schema.document.rawTokens,
      cleanTokens: schema.document.cleanTokens,
      createdAt: schema.document.createdAt,
    })
    .from(schema.document)
    .where(eq(schema.document.userId, userId))
    .orderBy(desc(schema.document.createdAt))
}

/** Fetch a single document scoped to its owner, or null. */
export async function getDocument(id: string, userId: string): Promise<DocumentRecord | null> {
  const rows = await db.select().from(schema.document).where(eq(schema.document.id, id))
  const doc = rows[0] as DocumentRecord | undefined
  if (!doc || doc.userId !== userId) return null
  return doc
}

/** Read the stored original file for a document (scoped to owner). Null if none/missing. */
export async function getDocumentFile(
  id: string,
  userId: string
): Promise<{ bytes: Buffer; mimetype: string | null; filename: string } | null> {
  const doc = await getDocument(id, userId)
  if (!doc || !doc.storagePath) return null
  try {
    const bytes = await readFile(storedFile(doc.storagePath))
    return { bytes, mimetype: doc.mimetype, filename: doc.sourceName }
  } catch {
    return null
  }
}

/** Delete a document (row + stored original) scoped to its owner. Returns true if removed. */
export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const doc = await getDocument(id, userId)
  if (!doc) return false

  if (doc.storagePath) {
    try {
      await rm(storedFile(doc.storagePath), { force: true })
    } catch {
      // Best-effort: a missing file shouldn't block deleting the row.
    }
  }

  await db.delete(schema.document).where(eq(schema.document.id, id))
  return true
}

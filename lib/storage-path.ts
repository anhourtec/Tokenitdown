import path from "node:path"

/**
 * Pure path helpers for storing original uploads on disk. Kept free of env/db
 * imports so they can be unit-tested in isolation.
 */

/**
 * Derive a safe, lowercase file extension (incl. the dot) from a filename.
 * Strips anything that isn't alphanumeric so a malicious name can't smuggle
 * path separators or traversal sequences into the stored path. Returns "" when
 * there is no usable extension.
 */
export function safeExtension(filename: string | null | undefined): string {
  if (!filename) return ""
  const ext = path.extname(filename).replace(/^\./, "")
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]/g, "")
  return cleaned ? `.${cleaned.slice(0, 16)}` : ""
}

/**
 * Build the relative on-disk path for an original upload: `<userId>/<id><ext>`.
 * `userId` and `id` are server-generated (session id / uuid) and the extension
 * is sanitized, so the result can never escape the storage root.
 */
export function buildStoragePath(userId: string, id: string, ext: string): string {
  return path.posix.join(userId, `${id}${ext}`)
}

/**
 * Resolve a relative storage path against `root`, refusing any result that
 * escapes `root` (defense in depth against traversal).
 */
export function resolveStoredFile(root: string, storagePath: string): string {
  const base = path.resolve(root)
  const abs = path.resolve(base, storagePath)
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new Error("Resolved storage path escapes the storage root")
  }
  return abs
}

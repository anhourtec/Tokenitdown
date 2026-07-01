import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"

/**
 * Content pipeline. EVERYTHING the landing page renders comes from Markdown files
 * in `content/` — no copy is hardcoded in components. A content editor can change
 * any headline, feature, FAQ, or blog post by editing a `.md` file, no code.
 *
 * Each file is frontmatter (structured fields the section needs) + an optional
 * Markdown body (long-form prose). `getSection` returns both.
 */

const CONTENT_DIR = path.join(process.cwd(), "content")

export interface Section<T = Record<string, unknown>> {
  /** Structured frontmatter fields for this section. */
  data: T
  /** The Markdown body (may be empty). */
  body: string
}

/**
 * Canonical site origin (no trailing slash). Uses NEXT_PUBLIC_SITE_URL when set
 * (e.g. the Netlify deploy URL), else the domain declared in `site.md`.
 */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL
  if (env) return env.replace(/\/+$/, "")
  const { data } = getSection<{ domain: string }>("site")
  return `https://${data.domain}`
}

/** Read and parse a single top-level content file, e.g. `getSection("hero")`. */
export function getSection<T = Record<string, unknown>>(name: string): Section<T> {
  const file = path.join(CONTENT_DIR, `${name}.md`)
  const raw = fs.readFileSync(file, "utf8")
  const { data, content } = matter(raw)
  return { data: data as T, body: content.trim() }
}

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  readingMinutes: number
}

export interface BlogPost extends BlogPostMeta {
  body: string
}

const BLOG_DIR = path.join(CONTENT_DIR, "blog")

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** All blog posts, newest first. Reads `content/blog/*.md`. */
export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), "utf8")
      const { data, content } = matter(raw)
      const body = content.trim()
      return {
        slug: f.replace(/\.md$/, ""),
        title: String(data.title ?? f),
        description: String(data.description ?? ""),
        date: String(data.date ?? ""),
        author: String(data.author ?? "AnHourTec"),
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        readingMinutes: readingMinutes(body),
        body,
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** One blog post by slug, or null. */
export function getBlogPost(slug: string): BlogPost | null {
  return getBlogPosts().find((p) => p.slug === slug) ?? null
}

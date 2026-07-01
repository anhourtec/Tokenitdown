import type { MetadataRoute } from "next"

import { getBlogPosts, siteUrl } from "@/lib/content"

/** Native App Router sitemap → served at /sitemap.xml. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const posts = getBlogPosts()
  const latest = posts[0]?.date ? new Date(posts[0].date) : new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, lastModified: latest, changeFrequency: "weekly", priority: 0.6 },
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : undefined,
    changeFrequency: "monthly",
    priority: 0.5,
  }))

  return [...staticRoutes, ...postRoutes]
}

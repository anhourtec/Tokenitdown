import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/content"

/** Native App Router robots → served at /robots.txt, pointing at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

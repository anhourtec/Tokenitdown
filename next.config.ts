import withBundleAnalyzer from "@next/bundle-analyzer"
import { type NextConfig } from "next"

import { env } from "./env.mjs"

const config: NextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  rewrites: async () => [
    { source: "/healthz", destination: "/api/health" },
    { source: "/api/healthz", destination: "/api/health" },
    { source: "/health", destination: "/api/health" },
    { source: "/ping", destination: "/api/health" },
    // Serve the docs (Nextra) container at the same origin under /docs. The docs
    // app builds with basePath "/docs", so both the page and its _next assets
    // live under /docs/*. Only active when DOCS_INTERNAL_URL is set (compose).
    ...(env.DOCS_INTERNAL_URL
      ? [
          { source: "/docs", destination: `${env.DOCS_INTERNAL_URL}/docs` },
          { source: "/docs/:path*", destination: `${env.DOCS_INTERNAL_URL}/docs/:path*` },
        ]
      : []),
  ],
}

export default env.ANALYZE ? withBundleAnalyzer({ enabled: env.ANALYZE })(config) : config

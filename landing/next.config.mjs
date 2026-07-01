/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app has its own lockfile; pin the tracing root so Next doesn't infer a
  // parent workspace when sibling lockfiles exist.
  outputFileTracingRoot: import.meta.dirname,
  // The landing site is deployed at the apex domain (tokenitdown.com). It links
  // out to the app and docs, which live on their own origins in production.
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://app.tokenitdown.com",
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || "https://tokenitdown.com/docs",
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/anhourtec/tokenitdown",
  },
}

export default nextConfig

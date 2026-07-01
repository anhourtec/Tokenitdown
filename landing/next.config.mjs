/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app has its own lockfile; pin the tracing root so Next doesn't infer a
  // parent workspace when sibling lockfiles exist.
  outputFileTracingRoot: import.meta.dirname,
  // The landing site is deployed on Netlify (tokenitdown.netlify.app for now).
  // It links out to the docs (its own Netlify site) and GitHub; the app origin
  // is not live yet. All overridable per environment.
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://app.tokenitdown.com",
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || "https://docs-tokenitdown.netlify.app",
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/anhourtec/Tokenitdown",
  },
}

export default nextConfig

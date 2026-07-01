import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

export default withNextra({
  reactStrictMode: true,
  // Served behind the main app at ip:PORT/docs (next.config rewrite). basePath
  // puts every page + _next asset under /docs so the proxy is a clean prefix.
  // On a standalone deploy (e.g. docs-tokenitdown.netlify.app) set
  // DOCS_STANDALONE=true to serve at the domain root instead.
  ...(process.env.DOCS_STANDALONE === 'true' ? {} : { basePath: '/docs' }),
})

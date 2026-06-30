import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

export default withNextra({
  reactStrictMode: true,
  // Served behind the main app at ip:PORT/docs (next.config rewrite). basePath
  // puts every page + _next asset under /docs so the proxy is a clean prefix.
  basePath: '/docs',
})

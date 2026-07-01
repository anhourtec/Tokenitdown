// Self-contained PostCSS config so the docs build does NOT walk up and inherit
// the repo root's config (which pulls in @tailwindcss/postcss). Nextra's CSS
// only needs @import resolution; Tailwind is not used here.
module.exports = {
  plugins: {
    "postcss-import": {},
  },
}

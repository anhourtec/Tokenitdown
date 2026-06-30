import React from 'react'
import { DocsThemeConfig, useConfig } from 'nextra-theme-docs'

const Logo = () => (
  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 6,
        background: 'linear-gradient(135deg, #2563EB, #60A5FA, #8B5CF6)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      T
    </span>
    <span>TokenItDown</span>
    <span style={{ fontWeight: 400, opacity: 0.6 }}>docs</span>
  </span>
)

const config: DocsThemeConfig = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/AnHourTec/TokenItDown',
  },
  docsRepositoryBase: 'https://github.com/AnHourTec/TokenItDown/tree/main/docs',
  footer: {
    content: (
      <span>
        TokenItDown by{' '}
        <a href="https://anhourtec.com" target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
          AnHourTec
        </a>{' '}
        · MIT licensed · Conversion powered by Microsoft MarkItDown
      </span>
    ),
  },
  color: {
    hue: 217,
    saturation: 91,
  },
  head: function Head() {
    const { frontMatter, title } = useConfig()
    const pageTitle = title && title !== 'TokenItDown' ? `${title} – TokenItDown` : 'TokenItDown Docs'
    const description =
      (frontMatter.description as string) ||
      'TokenItDown — a self-hostable platform that turns any document or web page into clean, LLM-ready Markdown, with native agent (MCP) access.'
    return (
      <>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#2563EB" />
        <meta name="og:title" content={pageTitle} />
        <meta name="og:description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </>
    )
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  darkMode: true,
}

export default config

import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"

import { ThemeProvider } from "@/components/theme-provider"
import { getSection } from "@/lib/content"

import "./globals.css"

interface SiteMeta {
  name: string
  tagline: string
  description: string
  domain: string
}

export function generateMetadata(): Metadata {
  const { data } = getSection<SiteMeta>("site")
  const title = `${data.name} — ${data.tagline}`
  return {
    metadataBase: new URL(`https://${data.domain}`),
    title: { default: title, template: `%s · ${data.name}` },
    description: data.description,
    openGraph: {
      title,
      description: data.description,
      url: `https://${data.domain}`,
      siteName: data.name,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: data.description },
    icons: { icon: "/token-it-down.svg" },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

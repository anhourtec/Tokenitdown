import { ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Eyebrow } from "@/components/eyebrow"
import { SoftCard } from "@/components/soft-card"
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import { getBlogPosts } from "@/lib/content"

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on token-efficient AI, document conversion, and Markdown workflows.",
}

function formatDate(s: string): string {
  if (!s) return ""
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function BlogIndexPage() {
  const posts = getBlogPosts()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <Eyebrow>Blog</Eyebrow>
          <h1 className="font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.03em]">Notes on token-efficient AI</h1>
          <p className="max-w-xl text-muted-foreground sm:text-lg">
            Short reads on document conversion, Markdown workflows, and getting more out of every token.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No posts yet. Check back soon.</p>
        ) : (
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block h-full">
                <SoftCard className="flex h-full flex-col gap-3 p-6 transition-transform duration-200 group-hover:-translate-y-1">
                  <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                    <span>{formatDate(post.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{post.readingMinutes} min read</span>
                  </div>
                  <h2 className="font-medium tracking-tight transition-colors group-hover:text-primary">{post.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                    Read
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </SoftCard>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

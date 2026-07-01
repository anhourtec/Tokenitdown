import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Markdown } from "@/components/markdown"
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import { getBlogPost, getBlogPosts } from "@/lib/content"

export function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}
  return { title: post.title, description: post.description }
}

function formatDate(s: string): string {
  if (!s) return ""
  return new Date(s).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back home
        </Link>
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>{formatDate(post.date)}</span>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
              <span aria-hidden>·</span>
              <span>{post.author}</span>
            </div>
            <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">{post.title}</h1>
            <p className="text-pretty text-lg text-muted-foreground">{post.description}</p>
          </header>
          <Markdown>{post.body}</Markdown>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

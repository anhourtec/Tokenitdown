import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getBlogPosts } from "@/lib/content"

function formatDate(s: string): string {
  if (!s) return ""
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function Blog() {
  const posts = getBlogPosts()
  if (posts.length === 0) return null

  return (
    <Section id="blog" eyebrow="Blog" title="Notes on token-efficient AI" bordered>
      <div className="mx-auto mt-14 grid max-w-4xl gap-4 text-left md:grid-cols-2">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={(i % 2) * 0.06}>
            <Link href={`/blog/${post.slug}`} className="group block h-full">
              <SoftCard className="flex h-full flex-col gap-3 p-6 transition-transform duration-200 group-hover:-translate-y-1">
                <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                  <span>{formatDate(post.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readingMinutes} min read</span>
                </div>
                <h3 className="font-medium tracking-tight transition-colors group-hover:text-primary">{post.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                  Read
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </SoftCard>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

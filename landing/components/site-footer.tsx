import Image from "next/image"

import { NewsletterForm } from "@/components/newsletter-form"
import { ScrollLink } from "@/components/scroll-link"
import { getSection } from "@/lib/content"
import { resolveHref } from "@/lib/utils"

interface FooterData {
  tagline: string
  columns: { title: string; links: { label: string; href: string }[] }[]
  newsletter: { title: string; body: string; placeholder: string; cta: string }
  legal: string
}

function FooterLink({ href, label }: { href: string; label: string }) {
  const cls = "text-sm text-muted-foreground transition-colors hover:text-foreground"
  if (href.startsWith("#")) {
    return (
      <ScrollLink targetId={href.slice(1)} className={cls}>
        {label}
      </ScrollLink>
    )
  }
  return (
    <a href={resolveHref(href)} className={cls}>
      {label}
    </a>
  )
}

export function SiteFooter() {
  const { data } = getSection<FooterData>("footer")
  const year = 2026

  return (
    <footer className="relative overflow-hidden border-t border-border bg-muted/20">
      {/* soft brand glow rising from the bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64"
        style={{
          background:
            "radial-gradient(40rem 16rem at 50% 120%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.3fr_2fr]">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Image src="/token-it-down.svg" alt="" width={24} height={24} className="size-6" />
            TokenItDown
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">{data.tagline}</p>
          <NewsletterForm
            title={data.newsletter.title}
            body={data.newsletter.body}
            placeholder={data.newsletter.placeholder}
            cta={data.newsletter.cta}
          />
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {data.columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">{col.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href} label={l.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {year} AnHourTec. {data.legal}</span>
          <span className="font-mono">tokenitdown.com</span>
        </div>
      </div>
    </footer>
  )
}

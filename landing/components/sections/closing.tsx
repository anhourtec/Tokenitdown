import { ArrowRight, GitPullRequest, MessageSquareWarning, Star } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { SoftCard } from "@/components/soft-card"
import { ButtonLink } from "@/components/ui/button"
import { getSection } from "@/lib/content"
import { resolveHref } from "@/lib/utils"

interface CtaData {
  title: string
  subtitle: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
}
interface CommunityData {
  eyebrow: string
  lede: string
  ways: { name: string; body: string }[]
}

const WAY_ICON = [Star, MessageSquareWarning, GitPullRequest]

/**
 * Single closing section: the conversion CTA up top, then the open-source
 * contribution content underneath, so the page ends on one unit instead of two
 * competing CTA blocks.
 */
export function Closing() {
  const { data: cta } = getSection<CtaData>("cta")
  const { data: community } = getSection<CommunityData>("community")

  return (
    <section id="community" className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_70%_at_50%_30%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{
          background:
            "radial-gradient(42rem 20rem at 50% 8%, color-mix(in oklch, var(--primary) 13%, transparent), transparent 70%)",
        }}
      />

      {/* conversion CTA */}
      <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 pt-28 pb-16 text-center sm:px-8">
        <h2 className="text-balance font-semibold text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.03em]">
          {cta.title}
        </h2>
        <p className="max-w-xl text-pretty text-muted-foreground sm:text-lg">{cta.subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={resolveHref(cta.primaryCta.href)} size="lg">
            {cta.primaryCta.label}
            <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href={resolveHref(cta.secondaryCta.href)} variant="secondary" size="lg">
            {cta.secondaryCta.label}
          </ButtonLink>
        </div>
      </Reveal>

      {/* open-source contribution */}
      <div className="mx-auto w-full max-w-4xl px-5 pb-28 sm:px-8">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-primary">{community.eyebrow}</span>
          <p className="text-pretty text-muted-foreground">{community.lede}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          {community.ways.map((w, i) => {
            const Icon = WAY_ICON[i] ?? Star
            return (
              <Reveal key={w.name} delay={i * 0.06}>
                <SoftCard className="flex h-full flex-col gap-2 p-6">
                  <Icon className="size-5 text-primary" />
                  <h3 className="font-medium">{w.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{w.body}</p>
                </SoftCard>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

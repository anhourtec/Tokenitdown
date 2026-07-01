import { ArrowRight } from "lucide-react"

import { BrowserFrame } from "@/components/browser-frame"
import { EmphasisHeading } from "@/components/emphasis-heading"
import { Eyebrow } from "@/components/eyebrow"
import { Reveal } from "@/components/reveal"
import { ButtonLink } from "@/components/ui/button"
import { getSection } from "@/lib/content"
import { resolveHref } from "@/lib/utils"

interface Cta {
  label: string
  href: string
}
interface HeroData {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: Cta
  secondaryCta: Cta
  trust: string
  image: string
  imageAlt: string
}

export function Hero() {
  const { data } = getSection<HeroData>("hero")
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] opacity-40 [mask-image:radial-gradient(60%_55%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]"
        style={{
          background:
            "radial-gradient(48rem 22rem at 50% -14%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 72%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-5 pt-20 pb-12 text-center sm:px-8 sm:pt-28">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow>{data.eyebrow}</Eyebrow>
          </Reveal>
        )}
        <Reveal delay={0.06}>
          <h1 className="text-balance font-semibold text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.035em]">
            <EmphasisHeading text={data.title} />
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {data.subtitle}
          </p>
        </Reveal>
        <Reveal delay={0.18} className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <ButtonLink href={resolveHref(data.primaryCta.href)} size="lg">
            {data.primaryCta.label}
            <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href={resolveHref(data.secondaryCta.href)} variant="secondary" size="lg">
            {data.secondaryCta.label}
          </ButtonLink>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="font-mono text-xs tracking-wide text-muted-foreground">{data.trust}</p>
        </Reveal>
      </div>

      <Reveal delay={0.1} y={24} className="mx-auto w-full max-w-5xl px-5 pb-6 sm:px-8">
        <BrowserFrame src={data.image} alt={data.imageAlt} priority />
      </Reveal>
    </section>
  )
}

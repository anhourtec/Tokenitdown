import { ArrowRight } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { ButtonLink } from "@/components/ui/button"
import { getSection } from "@/lib/content"
import { resolveHref } from "@/lib/utils"

interface CtaData {
  title: string
  subtitle: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
}

export function CtaBand() {
  const { data } = getSection<CtaData>("cta")
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_80%_at_50%_50%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40rem 20rem at 50% 50%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 py-28 text-center sm:px-8">
        <h2 className="text-balance font-semibold text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.03em]">
          {data.title}
        </h2>
        <p className="max-w-xl text-pretty text-muted-foreground sm:text-lg">{data.subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={resolveHref(data.primaryCta.href)} size="lg">
            {data.primaryCta.label}
            <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href={resolveHref(data.secondaryCta.href)} variant="secondary" size="lg">
            {data.secondaryCta.label}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  )
}

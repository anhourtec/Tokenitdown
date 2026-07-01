import { ArrowRight, Check, X } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface Col {
  title: string
  points: string[]
}
interface ProblemData {
  eyebrow: string
  title: string
  lede: string
  before: Col
  after: Col
}

export function Problem() {
  const { data } = getSection<ProblemData>("problem")
  return (
    <Section id="problem" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <div className="relative mx-auto mt-16 max-w-4xl">
        <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
          {/* before — raw, desaturated */}
          <Reveal>
            <SoftCard className="h-full bg-muted/30 p-0">
              <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <X className="size-4" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">{data.before.title}</span>
              </div>
              <ul className="flex flex-col gap-3.5 p-6">
                {data.before.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive/60" />
                    {p}
                  </li>
                ))}
              </ul>
            </SoftCard>
          </Reveal>

          {/* after — clean, brand-lit */}
          <Reveal delay={0.08}>
            <SoftCard className="h-full border-primary/25 bg-primary/[0.03] p-0 ring-1 ring-primary/10">
              <div className="flex items-center gap-2.5 border-b border-primary/15 px-6 py-4">
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Check className="size-4" />
                </span>
                <span className="text-sm font-medium">{data.after.title}</span>
              </div>
              <ul className="flex flex-col gap-3.5 p-6">
                {data.after.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </SoftCard>
          </Reveal>
        </div>

        {/* transformation arrow, centered on the seam (desktop) */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm md:flex"
        >
          <ArrowRight className="size-5 text-primary" />
        </div>
      </div>
    </Section>
  )
}

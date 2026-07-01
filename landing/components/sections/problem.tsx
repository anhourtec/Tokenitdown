import { ArrowRight } from "lucide-react"

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
  // Pair each raw-bytes problem with the clean-Markdown fix on the same row.
  const rows = data.before.points.map((raw, i) => ({ raw, clean: data.after.points[i] ?? "" }))

  return (
    <Section id="problem" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <Reveal className="mx-auto mt-14 max-w-4xl">
        <SoftCard className="overflow-hidden p-0">
          {/* column headers */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-muted/40 px-6 py-4">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {data.before.title}
              </span>
            </div>
            <div className="bg-primary/[0.04] px-6 py-4 md:border-l md:border-primary/15">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-primary">{data.after.title}</span>
            </div>
          </div>

          {/* paired rows */}
          {rows.map((row) => (
            <div key={row.raw} className="grid grid-cols-1 border-t border-border md:grid-cols-2">
              <div className="bg-muted/25 px-6 py-4 text-sm text-muted-foreground/80 line-through decoration-border decoration-1">
                {row.raw}
              </div>
              <div className="flex items-start gap-2.5 border-t border-border bg-primary/[0.02] px-6 py-4 text-sm md:border-t-0 md:border-l md:border-primary/15">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{row.clean}</span>
              </div>
            </div>
          ))}
        </SoftCard>
      </Reveal>
    </Section>
  )
}

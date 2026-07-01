import { Activity, Boxes, Files, Gauge, Library, ShieldCheck, type LucideIcon } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

const ICONS: Record<string, LucideIcon> = {
  library: Library,
  files: Files,
  shield: ShieldCheck,
  gauge: Gauge,
  boxes: Boxes,
  activity: Activity,
}

interface FeaturesData {
  eyebrow: string
  title: string
  lede: string
  features: { name: string; body: string; icon: string }[]
}

export function Features() {
  const { data } = getSection<FeaturesData>("features")
  return (
    <Section id="features" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.features.map((f, i) => {
          const Icon = ICONS[f.icon] ?? Boxes
          return (
            <Reveal key={f.name} delay={(i % 3) * 0.06}>
              <SoftCard className="flex h-full flex-col gap-3 p-6 transition-transform duration-200 hover:-translate-y-1">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <h3 className="font-medium">{f.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </SoftCard>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}

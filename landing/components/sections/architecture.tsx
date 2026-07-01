import { Cloud, Server } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface ArchData {
  eyebrow: string
  title: string
  lede: string
  services: { name: string; body: string }[]
  deploy: { name: string; body: string }[]
}

const DEPLOY_ICON = [Cloud, Server]

export function Architecture() {
  const { data } = getSection<ArchData>("architecture")
  return (
    <Section id="architecture" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <div className="mx-auto mt-14 grid max-w-5xl gap-8 text-left lg:grid-cols-[1.4fr_1fr]">
        <ol className="flex flex-col">
          {data.services.map((s, i) => (
            <Reveal
              as="li"
              key={s.name}
              delay={i * 0.05}
              className="flex gap-4 border-t border-border py-4 first:border-t-0"
            >
              <span className="font-mono text-sm text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">{s.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="flex flex-col gap-4">
          {data.deploy.map((d, i) => {
            const Icon = DEPLOY_ICON[i] ?? Server
            return (
              <Reveal key={d.name} delay={0.1 + i * 0.08}>
                <SoftCard className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <h3 className="font-medium">{d.name}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                </SoftCard>
              </Reveal>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

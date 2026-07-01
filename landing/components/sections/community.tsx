import { GitPullRequest, MessageSquareWarning, Star } from "lucide-react"

import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { ButtonLink } from "@/components/ui/button"
import { getSection } from "@/lib/content"
import { resolveHref } from "@/lib/utils"

interface CommunityData {
  eyebrow: string
  title: string
  lede: string
  ctas: { label: string; href: string; variant: "primary" | "secondary" }[]
  ways: { name: string; body: string }[]
}

const WAY_ICON = [Star, MessageSquareWarning, GitPullRequest]

export function Community() {
  const { data } = getSection<CommunityData>("community")
  return (
    <Section id="community" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <Reveal className="mt-8 flex flex-wrap justify-center gap-3">
        {data.ctas.map((c) => (
          <ButtonLink key={c.label} href={resolveHref(c.href)} variant={c.variant} size="lg">
            {c.label}
          </ButtonLink>
        ))}
      </Reveal>
      <div className="mx-auto mt-14 grid max-w-4xl gap-4 text-left sm:grid-cols-3">
        {data.ways.map((w, i) => {
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
    </Section>
  )
}

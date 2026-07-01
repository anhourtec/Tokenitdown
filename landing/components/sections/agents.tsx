import { Terminal } from "lucide-react"

import { CodeBlock } from "@/components/code-block"
import { CodeTabs } from "@/components/code-tabs"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface AgentsData {
  eyebrow: string
  title: string
  lede: string
  install: { title: string; managers: { name: string; cmd: string }[] }
  skill: { title: string; cmd: string }
  mcp: { title: string; local: { label: string; cmd: string }; hosted: { label: string; cmd: string } }
  tools: { name: string; body: string }[]
  api: { title: string; body: string; cmd: string }
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">{children}</h3>
}

export function Agents() {
  const { data } = getSection<AgentsData>("agents")
  return (
    <Section id="agents" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 text-left lg:grid-cols-2">
        <Reveal className="flex min-w-0 flex-col gap-8">
          <div>
            <Label>{data.install.title}</Label>
            <CodeTabs tabs={data.install.managers} />
          </div>
          <div>
            <Label>{data.skill.title}</Label>
            <CodeBlock code={data.skill.cmd} label="terminal" />
          </div>
          <div>
            <Label>{data.api.title}</Label>
            <p className="mb-3 text-sm text-muted-foreground">{data.api.body}</p>
            <CodeBlock code={data.api.cmd} label="curl" />
          </div>
        </Reveal>

        <Reveal delay={0.08} className="flex min-w-0 flex-col gap-8">
          <div>
            <Label>{data.mcp.title}</Label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">{data.mcp.local.label}</span>
                <CodeBlock code={data.mcp.local.cmd} label="stdio" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">{data.mcp.hosted.label}</span>
                <CodeBlock code={data.mcp.hosted.cmd} label="http" />
              </div>
            </div>
          </div>
          <div>
            <Label>Tools your agent gets</Label>
            <SoftCard as="ul" className="flex flex-col divide-y divide-border p-0">
              {data.tools.map((t) => (
                <li key={t.name} className="flex items-start gap-3 p-4">
                  <Terminal className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <code className="font-mono text-sm">{t.name}</code>
                    <span className="text-xs text-muted-foreground">{t.body}</span>
                  </div>
                </li>
              ))}
            </SoftCard>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

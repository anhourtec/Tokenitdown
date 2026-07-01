import { AgentLogo } from "@/components/agent-logo"
import { Marquee } from "@/components/marquee"
import { Reveal } from "@/components/reveal"
import { getSection } from "@/lib/content"

interface WorksWithData {
  label: string
  items: { name: string; slug?: string }[]
}

/** Quiet marquee of the MCP hosts TokenItDown plugs into, with brand marks. */
export function WorksWith() {
  const { data } = getSection<WorksWithData>("works-with")
  return (
    <section className="border-y border-border bg-muted/20 py-12">
      <Reveal className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 px-5 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{data.label}</p>
        <Marquee>
          {data.items.map((item) => (
            <span
              key={item.name}
              className="flex items-center gap-2 whitespace-nowrap text-base font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <AgentLogo slug={item.slug} className="size-5" />
              {item.name}
            </span>
          ))}
        </Marquee>
      </Reveal>
    </section>
  )
}

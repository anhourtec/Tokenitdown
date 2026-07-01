import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface FormatsData {
  eyebrow: string
  title: string
  lede: string
  groups: { name: string; items: string[] }[]
}

export function Formats() {
  const { data } = getSection<FormatsData>("formats")
  return (
    <Section id="formats" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <Reveal className="mx-auto mt-14 max-w-5xl">
        <SoftCard className="grid divide-y divide-border p-0 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {data.groups.map((group) => (
            <div key={group.name} className="flex flex-col gap-4 p-6 sm:[&:nth-child(2)]:border-l sm:[&:nth-child(2)]:border-border lg:[&:nth-child(2)]:border-l-0">
              <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{group.name}</h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/90"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </SoftCard>
      </Reveal>
    </Section>
  )
}

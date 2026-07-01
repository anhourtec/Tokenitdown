import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface FaqData {
  eyebrow: string
  title: string
  items: { q: string; a: string }[]
}

export function Faq() {
  const { data } = getSection<FaqData>("faq")
  return (
    <Section id="faq" eyebrow={data.eyebrow} title={data.title} bordered>
      <dl className="mx-auto mt-14 grid max-w-4xl gap-4 text-left md:grid-cols-2">
        {data.items.map((item, i) => (
          <Reveal as="div" key={item.q} delay={(i % 2) * 0.06}>
            <SoftCard as="div" className="h-full p-6">
              <dt className="mb-3 font-medium tracking-tight">{item.q}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
            </SoftCard>
          </Reveal>
        ))}
      </dl>
    </Section>
  )
}

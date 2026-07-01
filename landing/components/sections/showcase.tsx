import { Section } from "@/components/section"
import { ShowcaseTabs, type Sample } from "@/components/showcase-tabs"
import { getSection } from "@/lib/content"

interface ShowcaseData {
  eyebrow: string
  title: string
  lede: string
  samples: Sample[]
}

export function Showcase() {
  const { data } = getSection<ShowcaseData>("showcase")
  return (
    <Section id="showcase" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <ShowcaseTabs samples={data.samples} />
    </Section>
  )
}

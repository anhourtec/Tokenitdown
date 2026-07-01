import { BrowserFrame } from "@/components/browser-frame"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { getSection } from "@/lib/content"

interface ShotsData {
  eyebrow: string
  title: string
  lede: string
  shots: { src: string; label: string; caption: string }[]
}

/** One product screenshot per scroll: a small centered heading + a framed shot. */
export function Spotlights() {
  const { data } = getSection<ShotsData>("screenshots")
  return (
    <Section id="product" eyebrow={data.eyebrow} title={data.title} lede={data.lede} bordered>
      <div className="mx-auto mt-16 flex max-w-5xl flex-col gap-24">
        {data.shots.map((shot) => (
          <Reveal key={shot.src} y={20} className="flex flex-col items-center gap-6">
            <div className="flex max-w-xl flex-col items-center gap-2 text-center">
              <h3 className="font-semibold text-xl tracking-tight sm:text-2xl">{shot.label}</h3>
              <p className="text-pretty text-muted-foreground">{shot.caption}</p>
            </div>
            <BrowserFrame src={shot.src} alt={shot.label} className="w-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

import Image from "next/image"

import { Reveal } from "@/components/reveal"
import { SoftCard } from "@/components/soft-card"
import { getSection } from "@/lib/content"

interface TrustData {
  eyebrow: string
  title: string
  lede: string
  badges: string[]
  poweredBy: { logo: string; name: string; href: string }
}

export function Trust() {
  const { data } = getSection<TrustData>("trust")
  return (
    <section className="border-t border-border px-5 py-20 sm:px-8 sm:py-24">
      <Reveal className="mx-auto max-w-4xl">
        <SoftCard className="grid gap-8 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">{data.eyebrow}</span>
            <a
              href={data.poweredBy.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Image src={data.poweredBy.logo} alt="Microsoft" width={20} height={20} />
              {data.title}
            </a>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{data.lede}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {data.badges.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
        </SoftCard>
      </Reveal>
    </section>
  )
}

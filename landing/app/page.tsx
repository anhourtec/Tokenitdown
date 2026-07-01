import { Agents } from "@/components/sections/agents"
import { Closing } from "@/components/sections/closing"
import { Faq } from "@/components/sections/faq"
import { Features } from "@/components/sections/features"
import { Formats } from "@/components/sections/formats"
import { Hero } from "@/components/sections/hero"
import { Problem } from "@/components/sections/problem"
import { Showcase } from "@/components/sections/showcase"
import { Spotlights } from "@/components/sections/spotlights"
import { Trust } from "@/components/sections/trust"
import { WorksWith } from "@/components/sections/works-with"
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <WorksWith />
        <Problem />
        <Showcase />
        <Spotlights />
        <Features />
        <Formats />
        <Agents />
        <Trust />
        <Faq />
        <Closing />
      </main>
      <SiteFooter />
    </>
  )
}

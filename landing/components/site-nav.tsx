import { NavBar, type NavData } from "@/components/nav-bar"
import { getSection } from "@/lib/content"

export function SiteNav() {
  const { data } = getSection<NavData>("site")
  return <NavBar data={data} />
}

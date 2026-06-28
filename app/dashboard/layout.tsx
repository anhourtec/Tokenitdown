import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"

import { HeaderActions } from "./_components/header/header-actions"
import { AppSidebar } from "./_components/sidebar/app-sidebar"

// The dashboard is auth-gated and per-user: never statically prerender it. Without
// this, `next build` (which has no DB/session) prerenders child routes — e.g.
// /dashboard/convert — into cached 404s. force-dynamic renders every dashboard
// route per request.
export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Authoritative session check (middleware does an optimistic cookie check).
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/login")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  const user = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? undefined,
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
          />
          <h1 className="text-sm font-medium">Dashboard</h1>
          <div className="ml-auto">
            <HeaderActions user={user} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

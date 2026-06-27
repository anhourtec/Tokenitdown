"use client"

import Link from "next/link"

import { Logo } from "@/components/ui/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { sidebarItems } from "@/navigation/sidebar/sidebar-items"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { SidebarSupportCard } from "./sidebar-support-card"

interface AppSidebarUser {
  readonly name: string
  readonly email: string
  readonly avatar?: string
}

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: AppSidebarUser }) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link prefetch={false} href="/dashboard">
                <Logo className="!size-5 text-primary" aria-hidden />
                <span className="text-base font-semibold">TokenItDown</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarSupportCard />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

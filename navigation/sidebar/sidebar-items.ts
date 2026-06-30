import {
  Boxes,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Plug,
  Plug2,
  Settings,
  Upload,
} from "lucide-react"

import { CONVERT_FORMATS } from "@/app/dashboard/convert/formats"

export type NavBadge = "new" | "soon"

export interface NavSubItem {
  id: string
  title: string
  url: string
  icon?: LucideIcon
  badge?: NavBadge
  disabled?: boolean
  newTab?: boolean
}

interface NavItemBase {
  id: string
  title: string
  icon?: LucideIcon
  badge?: NavBadge
  disabled?: boolean
  newTab?: boolean
  /** For parent items: expand the submenu by default. */
  defaultOpen?: boolean
}

export interface NavMainLinkItem extends NavItemBase {
  url: string
  subItems?: never
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[]
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem

export interface NavGroup {
  id: number
  label?: string
  items: NavMainItem[]
}

/**
 * TokenItDown sidebar navigation. Routes beyond /dashboard are placeholders
 * (url "#") until those features are built — see PLAN.md.
 */
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Workspace",
    items: [
      { id: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      {
        id: "convert",
        title: "Convert",
        icon: Upload,
        defaultOpen: true,
        subItems: [
          { id: "convert-all", title: "All formats", url: "/dashboard/convert" },
          ...CONVERT_FORMATS.map((f) => ({
            id: `convert-${f.slug}`,
            title: f.navLabel,
            url: `/dashboard/convert/${f.slug}`,
            icon: f.icon,
          })),
        ],
      },
      { id: "library", title: "Library", url: "/dashboard/library", icon: FolderOpen },
      { id: "documents", title: "Documents", url: "/dashboard/documents", icon: FileText },
    ],
  },
  {
    id: 2,
    label: "AI",
    items: [
      { id: "rag", title: "RAG Export", url: "/dashboard/rag", icon: Boxes },
      { id: "connect", title: "Connect editor", url: "/dashboard/connect", icon: Plug2 },
      { id: "analytics", title: "Analytics", url: "/dashboard/analytics", icon: Gauge },
    ],
  },
  {
    id: 3,
    label: "Settings",
    items: [
      { id: "integrations", title: "Integrations", url: "#", icon: Plug, badge: "soon", disabled: true },
      { id: "settings", title: "Settings", url: "/dashboard/settings", icon: Settings },
    ],
  },
]

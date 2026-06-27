import {
  Boxes,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Minimize2,
  Plug,
  Settings,
  Upload,
} from "lucide-react"

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
      { id: "library", title: "Library", url: "#", icon: FolderOpen },
      { id: "convert", title: "Convert", url: "#", icon: Upload },
      { id: "documents", title: "Documents", url: "#", icon: FileText },
    ],
  },
  {
    id: 2,
    label: "AI",
    items: [
      { id: "rag", title: "RAG Export", url: "#", icon: Boxes, badge: "new" },
      { id: "compressor", title: "Token Compressor", url: "#", icon: Minimize2, badge: "new" },
      { id: "analytics", title: "Analytics", url: "#", icon: Gauge },
    ],
  },
  {
    id: 3,
    label: "Settings",
    items: [
      { id: "integrations", title: "Integrations", url: "#", icon: Plug, badge: "soon", disabled: true },
      { id: "settings", title: "Settings", url: "#", icon: Settings },
    ],
  },
]

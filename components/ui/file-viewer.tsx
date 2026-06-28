"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Check, Code2, Copy, Eye, FileCode, FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/ui/markdown"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const MARKDOWN_EXTS = ["md", "mdx", "markdown"]

export interface ApiComponent {
  name: string
  version?: string
  files: Array<{
    path: string
    content?: string
  }>
}

interface TreeViewElement {
  id: string
  name: string
  isSelectable?: boolean
  children?: TreeViewElement[]
}
interface TreeContextProps {
  selectedId: string | undefined
  expandedItems: string[] | undefined
  handleExpand: (id: string) => void
  selectItem: (id: string) => void
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>
  indicator: boolean
  direction: "rtl" | "ltr"
}
const TreeContext = createContext<TreeContextProps | null>(null)
const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) throw new Error("useTree must be used within a TreeProvider")
  return context
}

// Normalize a file extension to a Shiki language id.
const LANG_MAP: Record<string, string> = {
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  text: "plaintext",
  tsx: "tsx",
  ts: "typescript",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  xml: "xml",
  csv: "plaintext",
}
const SHIKI_LANGS = ["markdown", "plaintext", "tsx", "typescript", "javascript", "jsx", "json", "css", "scss", "html", "xml"]

export function ShikiViewer({
  code,
  lang = "markdown",
  showLineNumbers = true,
  className,
}: {
  code: string
  lang?: string
  showLineNumbers?: boolean
  className?: string
}) {
  const [html, setHtml] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    let mounted = true
    async function highlight() {
      try {
        setIsLoading(true)
        const shikiTheme = resolvedTheme === "dark" ? "github-dark" : "github-light"
        const { createHighlighter } = await import("shiki")
        const highlighter = await createHighlighter({ langs: SHIKI_LANGS, themes: [shikiTheme] })
        const resolvedLang = LANG_MAP[lang] ?? "plaintext"
        const highlightedHtml = highlighter.codeToHtml(code, { lang: resolvedLang, theme: shikiTheme })
        if (mounted) {
          setHtml(highlightedHtml)
          setIsLoading(false)
        }
      } catch {
        if (mounted) {
          setHtml(`<pre><code>${code.replace(/</g, "&lt;")}</code></pre>`)
          setIsLoading(false)
        }
      }
    }
    void highlight()
    return () => {
      mounted = false
    }
  }, [code, lang, resolvedTheme])

  const addLineNumbers = (rawHtml: string) => {
    if (!showLineNumbers) return rawHtml
    const lines = code.split("\n")
    const lineNumbers = lines.map((_, i) => `<span>${i + 1}</span>`).join("")
    return rawHtml.replace(
      /<pre[^>]*>([\s\S]*)<\/pre>/,
      `<pre class="line-numbers"><span class="line-numbers-rows">${lineNumbers}</span>$1</pre>`
    )
  }

  return (
    <>
      <style>{`
        .shiki-viewer { overflow: hidden; }
        .shiki-viewer pre { margin: 0; padding: 1rem; overflow-x: auto; background: transparent !important; font-size: 0.8125rem; line-height: 1.6; white-space: pre; }
        .shiki-viewer code { background: transparent; padding: 0; font-family: var(--font-geist-mono, ui-monospace, monospace); font-size: inherit; line-height: inherit; white-space: pre; }
        .shiki-viewer .line-numbers { display: flex; }
        .shiki-viewer .line-numbers .line-numbers-rows { display: flex; flex-direction: column; padding-right: 0.75rem; margin-right: 0.75rem; border-right: 1px solid var(--border); text-align: right; color: var(--muted-foreground); font-size: 0.75rem; line-height: 1.6; padding-top: 1rem; user-select: none; }
        .shiki-viewer .line-numbers .line-numbers-rows > span { display: block; min-width: 1.5rem; }
      `}</style>
      <div className={cn("shiki-viewer", className)}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: addLineNumbers(html) }} />
        )}
      </div>
    </>
  )
}

function getFileType(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
  return (ext || "txt").toUpperCase()
}

function FileHeader({
  file,
  onCopy,
  copied,
  actions,
  isMarkdown,
  view,
  onToggleView,
}: {
  file: { path: string; content?: string }
  onCopy: () => void
  copied: boolean
  actions?: React.ReactNode
  isMarkdown: boolean
  view: "preview" | "raw"
  onToggleView: (next: "preview" | "raw") => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {getFileType(file.path)}
        </Badge>
        <span className="truncate text-xs text-muted-foreground">{file.path}</span>
      </div>
      <div className="flex items-center gap-1">
        {isMarkdown && (
          <div className="mr-1 flex items-center rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => onToggleView("preview")}
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
                view === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3" /> Preview
            </button>
            <button
              type="button"
              onClick={() => onToggleView("raw")}
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
                view === "raw" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="size-3" /> Raw
            </button>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onCopy} className="size-8" title="Copy content">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
        {actions}
      </div>
    </div>
  )
}

function TreeIndicator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("absolute left-1.5 h-full w-px rounded-md bg-border py-3 transition-colors rtl:right-1.5", className)}
      {...props}
    />
  )
}

function Folder({
  element,
  value,
  isSelectable = true,
  isSelect,
  children,
  className,
}: {
  element: string
  value: string
  isSelectable?: boolean
  isSelect?: boolean
  children: React.ReactNode
  className?: string
}) {
  const { direction, handleExpand, expandedItems, indicator } = useTree()
  return (
    <AccordionPrimitive.Item value={value} className="relative h-full overflow-hidden">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
          isSelect && isSelectable && "bg-muted",
          !isSelectable && "cursor-not-allowed opacity-50",
          className
        )}
        disabled={!isSelectable}
        onClick={() => handleExpand(value)}
      >
        {expandedItems?.includes(value) ? <FolderOpenIcon className="size-4" /> : <FolderIcon className="size-4" />}
        <span className="truncate">{element}</span>
      </AccordionPrimitive.Trigger>
      <AccordionPrimitive.Content className="relative h-full overflow-hidden text-sm">
        {indicator && <TreeIndicator />}
        <AccordionPrimitive.Root
          type="multiple"
          className={cn("ml-5 flex flex-col gap-1 py-1", direction === "rtl" && "mr-5")}
          value={expandedItems}
        >
          {children}
        </AccordionPrimitive.Root>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}

function File({
  value,
  isSelectable = true,
  isSelect,
  fileIcon,
  children,
  className,
  onClick,
}: {
  value: string
  isSelectable?: boolean
  isSelect?: boolean
  fileIcon?: React.ReactNode
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const { selectedId, selectItem } = useTree()
  const isSelected = isSelect ?? selectedId === value
  return (
    <button
      disabled={!isSelectable}
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm transition-colors",
        isSelected && isSelectable && "bg-muted",
        !isSelectable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={() => {
        selectItem(value)
        onClick?.()
      }}
    >
      {fileIcon ?? <FileIcon className="size-4 shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  )
}

function Tree({
  elements,
  initialSelectedId,
  initialExpandedItems,
  children,
  className,
  indicator = true,
  dir = "ltr",
}: {
  elements?: TreeViewElement[]
  initialSelectedId?: string
  initialExpandedItems?: string[]
  children: React.ReactNode
  className?: string
  indicator?: boolean
  dir?: "rtl" | "ltr"
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId)
  const [expandedItems, setExpandedItems] = useState<string[] | undefined>(initialExpandedItems)
  const getAllExpandableItems = useCallback((els?: TreeViewElement[]): string[] => {
    const out: string[] = []
    const traverse = (items: TreeViewElement[]) => {
      items.forEach((item) => {
        if (item.children?.length) {
          out.push(item.id)
          traverse(item.children)
        }
      })
    }
    if (els) traverse(els)
    return out
  }, [])
  const selectItem = useCallback((id: string) => setSelectedId(id), [])
  const handleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => (prev?.includes(id) ? prev.filter((i) => i !== id) : [...(prev ?? []), id]))
  }, [])
  useEffect(() => {
    if (elements) setExpandedItems(getAllExpandableItems(elements))
  }, [elements, getAllExpandableItems])
  return (
    <TreeContext.Provider
      value={{ selectedId, expandedItems, handleExpand, selectItem, setExpandedItems, indicator, direction: dir }}
    >
      <div className={cn("size-full", className)}>
        <div className="relative h-full px-2">
          <AccordionPrimitive.Root type="multiple" value={expandedItems} className="flex flex-col gap-1">
            {children}
          </AccordionPrimitive.Root>
        </div>
      </div>
    </TreeContext.Provider>
  )
}

function TreeItem({
  item,
  selectedFile,
  onFileSelect,
}: {
  item: TreeViewElement
  selectedFile?: string
  onFileSelect: (file: string) => void
}) {
  if (item.children?.length) {
    return (
      <Folder key={item.id} element={item.name} value={item.id} className="truncate">
        {item.children.map((child) => (
          <TreeItem key={child.id} item={child} selectedFile={selectedFile} onFileSelect={onFileSelect} />
        ))}
      </Folder>
    )
  }
  return (
    <File
      key={item.id}
      value={item.id}
      onClick={() => onFileSelect(item.id)}
      isSelect={selectedFile === item.id}
      className="truncate whitespace-nowrap"
    >
      {item.name}
    </File>
  )
}

function FileTree({
  tree,
  selectedFile,
  onFileSelect,
  component,
}: {
  tree: TreeViewElement[]
  selectedFile?: string
  onFileSelect: (file: string) => void
  component: ApiComponent
}) {
  const allExpandableItems = useMemo(() => {
    const out: string[] = []
    const traverse = (els: TreeViewElement[]) => {
      els.forEach((el) => {
        if (el.children?.length) {
          out.push(el.id)
          traverse(el.children)
        }
      })
    }
    traverse(tree)
    return out
  }, [tree])
  return (
    <div className="flex h-full w-full flex-col border-r">
      <div className="flex items-center gap-2 border-b p-3">
        <FileCode className="size-4" />
        <span className="truncate text-sm font-medium">{component.name}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <Tree elements={tree} initialExpandedItems={allExpandableItems} initialSelectedId={selectedFile} indicator>
            {tree.map((item) => (
              <TreeItem key={item.id} item={item} selectedFile={selectedFile} onFileSelect={onFileSelect} />
            ))}
          </Tree>
        </div>
      </ScrollArea>
    </div>
  )
}

export default function ComponentFileViewer({
  component,
  className,
  headerActions,
  onActiveFileChange,
}: {
  component: ApiComponent
  className?: string
  /** Extra buttons rendered in the file header (operate on the active file). */
  headerActions?: React.ReactNode
  /** Called with the active file's path whenever it changes. */
  onActiveFileChange?: (path: string) => void
}) {
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<"preview" | "raw">("preview")
  const files = useMemo(() => component.files.filter((f) => f.content), [component.files])

  const tree = useMemo(() => {
    const root: Record<string, TreeViewElement & { children?: Record<string, unknown> }> = {}
    for (const file of files) {
      const parts = file.path.split("/")
      let current: Record<string, unknown> = root
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!
        if (!current[part]) {
          current[part] =
            i === parts.length - 1
              ? { id: file.path, name: part, isSelectable: true }
              : { id: parts.slice(0, i + 1).join("/"), name: part, children: {}, isSelectable: false }
        }
        const node = current[part] as { children?: Record<string, unknown> }
        current = node.children ?? (current[part] as Record<string, unknown>)
      }
    }
    const toArray = (obj: Record<string, unknown>): TreeViewElement[] =>
      Object.values(obj).map((item) => {
        const node = item as TreeViewElement & { children?: Record<string, unknown> }
        return node.children ? { ...node, children: toArray(node.children) } : (node as TreeViewElement)
      })
    return toArray(root as Record<string, unknown>)
  }, [files])

  const selected = files.find((f) => f.path === selectedFile) ?? files[0]

  useEffect(() => {
    if (!selectedFile && files.length > 0) setSelectedFile(files[0]!.path)
  }, [files, selectedFile])

  useEffect(() => {
    if (selected?.path) onActiveFileChange?.(selected.path)
  }, [selected?.path, onActiveFileChange])

  const handleCopy = () => {
    if (selected?.content) {
      void navigator.clipboard.writeText(selected.content)
      setCopied(true)
      toast.success("Content copied")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <ResizablePanelGroup direction="horizontal" className={cn("rounded-lg border", className)}>
      <ResizablePanel defaultSize={26} minSize={18} maxSize={42}>
        <FileTree tree={tree} selectedFile={selectedFile} onFileSelect={setSelectedFile} component={component} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={74} minSize={40}>
        {selected ? (
          (() => {
            const ext = selected.path.split(".").pop()?.toLowerCase() ?? ""
            const isMarkdown = MARKDOWN_EXTS.includes(ext)
            return (
              <div className="flex h-full flex-col">
                <FileHeader
                  file={selected}
                  onCopy={handleCopy}
                  copied={copied}
                  actions={headerActions}
                  isMarkdown={isMarkdown}
                  view={view}
                  onToggleView={setView}
                />
                <ScrollArea className="min-h-0 flex-1">
                  {isMarkdown && view === "preview" ? (
                    <div className="p-5">
                      <Markdown content={selected.content ?? ""} />
                    </div>
                  ) : (
                    <ShikiViewer code={selected.content ?? ""} lang={ext || "markdown"} />
                  )}
                </ScrollArea>
              </div>
            )
          })()
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">No file selected</div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

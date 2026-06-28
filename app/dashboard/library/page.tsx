import { LibraryClient } from "./_components/library-client"

export const metadata = {
  title: "Library · TokenItDown",
}

export default function LibraryPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Library</h2>
        <p className="text-muted-foreground text-sm">Your converted documents. View, download, or remove them.</p>
      </div>
      <LibraryClient />
    </div>
  )
}

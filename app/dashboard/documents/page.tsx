import { DocumentsClient } from "./_components/documents-client"

export const metadata = {
  title: "Documents · TokenItDown",
}

export default function DocumentsPage() {
  return (
    <div className="@container/main flex min-h-0 flex-1 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Your original uploaded files. Preview them here, download the original, or open the converted Markdown.
        </p>
      </div>
      <DocumentsClient />
    </div>
  )
}

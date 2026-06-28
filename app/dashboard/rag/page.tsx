import { RagClient } from "./_components/rag-client"

export const metadata = {
  title: "RAG Export · TokenItDown",
}

export default function RagPage() {
  return (
    <div className="@container/main flex min-h-0 flex-1 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">RAG Export</h2>
        <p className="text-muted-foreground text-sm">
          Chunk a converted document by heading and export it as JSONL for your retrieval pipeline.
        </p>
      </div>
      <RagClient />
    </div>
  )
}

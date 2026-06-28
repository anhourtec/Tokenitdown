import { ConvertClient } from "./_components/convert-client"

import { env } from "../../../env.mjs"

export const metadata = {
  title: "Convert · TokenItDown",
}

export default function ConvertPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Convert to Markdown</h2>
        <p className="text-muted-foreground text-sm">
          Drop in documents or paste a URL — PDF, Word, PowerPoint, Excel, images, audio, HTML, CSV/JSON/XML,
          ZIP, EPUB and YouTube links all become clean, LLM-ready Markdown.
        </p>
      </div>
      <ConvertClient maxUploadBytes={env.MAX_UPLOAD_BYTES} />
    </div>
  )
}

import { notFound } from "next/navigation"

import { env } from "../../../../env.mjs"
import { Converter } from "../_components/converter"
import { CONVERT_FORMATS, getFormat } from "../formats"

export function generateStaticParams() {
  return CONVERT_FORMATS.map((f) => ({ format: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ format: string }> }) {
  const { format } = await params
  const f = getFormat(format)
  return { title: f ? `${f.title} · TokenItDown` : "Convert · TokenItDown" }
}

export default async function FormatConvertPage({ params }: { params: Promise<{ format: string }> }) {
  const { format } = await params
  const f = getFormat(format)
  if (!f) notFound()

  const Icon = f.icon
  // Strip the icon (a component) before handing config to the client converter —
  // only plain, serializable values may cross the server→client boundary.
  const { icon: _icon, ...converterFormat } = f

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-2xl tracking-tight">{f.title}</h2>
          <p className="text-muted-foreground text-sm">{f.description}</p>
        </div>
      </div>
      <Converter format={converterFormat} maxUploadBytes={env.MAX_UPLOAD_BYTES} />
    </div>
  )
}

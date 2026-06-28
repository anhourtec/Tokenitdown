import {
  BookOpen,
  Braces,
  FileArchive,
  FileAudio,
  FileText,
  FileType2,
  Globe,
  Image as ImageIcon,
  Link2,
  type LucideIcon,
  Presentation,
  Sheet,
} from "lucide-react"

import type { FormatFileProps } from "@/components/ui/file-card"

export interface ConvertFormat {
  /** URL slug under /dashboard/convert/<slug> */
  slug: string
  /** Short sidebar label, e.g. "Md PDF" */
  navLabel: string
  /** Page heading, e.g. "PDF → Markdown" */
  title: string
  /** One-line description shown on the page + hub card */
  description: string
  icon: LucideIcon
  /** file-type cards shown as a visual collection on the hub + upload page */
  cards: FormatFileProps[]
  /** "file" = upload; "url" = paste a link (web page / YouTube) */
  mode: "file" | "url"
  /** input accept attribute (file mode) */
  accept?: string
  /** human-readable accepted extensions, shown under the dropzone */
  extensions?: string[]
}

export const CONVERT_FORMATS: ConvertFormat[] = [
  {
    slug: "pdf",
    navLabel: "Md PDF",
    title: "PDF → Markdown",
    description: "Digital and scanned PDFs into clean, structured Markdown.",
    icon: FileText,
    cards: ["pdf"],
    mode: "file",
    accept: ".pdf,application/pdf",
    extensions: ["PDF"],
  },
  {
    slug: "word",
    navLabel: "Md Docs",
    title: "Word → Markdown",
    description: "Word documents (.docx, .doc) with headings, lists and tables.",
    icon: FileType2,
    cards: ["doc"],
    mode: "file",
    accept: ".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["DOCX", "DOC"],
  },
  {
    slug: "powerpoint",
    navLabel: "Md PPTX",
    title: "PowerPoint → Markdown",
    description: "Slide decks (.pptx, .ppt) flattened into readable Markdown.",
    icon: Presentation,
    cards: ["pptx"],
    mode: "file",
    accept: ".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extensions: ["PPTX", "PPT"],
  },
  {
    slug: "excel",
    navLabel: "Md Excel",
    title: "Excel → Markdown",
    description: "Spreadsheets (.xlsx, .xls) into Markdown tables.",
    icon: Sheet,
    cards: ["xlsx"],
    mode: "file",
    accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: ["XLSX", "XLS"],
  },
  {
    slug: "image",
    navLabel: "Md Image",
    title: "Image → Markdown",
    description: "Images via OCR + EXIF metadata extraction.",
    icon: ImageIcon,
    cards: ["png", "jpg", "img"],
    mode: "file",
    accept: "image/*,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp",
    extensions: ["PNG", "JPG", "GIF", "BMP", "TIFF", "WEBP"],
  },
  {
    slug: "audio",
    navLabel: "Md Audio",
    title: "Audio → Markdown",
    description: "Speech transcription + EXIF metadata from audio files.",
    icon: FileAudio,
    cards: ["mp3"],
    mode: "file",
    accept: "audio/*,.mp3,.wav,.m4a",
    extensions: ["MP3", "WAV", "M4A"],
  },
  {
    slug: "html",
    navLabel: "Md HTML",
    title: "HTML → Markdown",
    description: "Local HTML files into tidy Markdown.",
    icon: Globe,
    cards: ["html"],
    mode: "file",
    accept: ".html,.htm,text/html",
    extensions: ["HTML", "HTM"],
  },
  {
    slug: "data",
    navLabel: "Md Data",
    title: "Data → Markdown",
    description: "Structured text — CSV, JSON, XML — into Markdown.",
    icon: Braces,
    cards: ["csv", "json", "txt"],
    mode: "file",
    accept: ".csv,.tsv,.json,.xml,text/csv,application/json,application/xml",
    extensions: ["CSV", "TSV", "JSON", "XML"],
  },
  {
    slug: "archive",
    navLabel: "Md ZIP",
    title: "ZIP → Markdown",
    description: "ZIP archives — every supported file inside is converted.",
    icon: FileArchive,
    cards: ["zip"],
    mode: "file",
    accept: ".zip,application/zip",
    extensions: ["ZIP"],
  },
  {
    slug: "epub",
    navLabel: "Md EPUB",
    title: "EPUB → Markdown",
    description: "E-books (.epub) into Markdown.",
    icon: BookOpen,
    cards: ["epub"],
    mode: "file",
    accept: ".epub,application/epub+zip",
    extensions: ["EPUB"],
  },
  {
    slug: "url",
    navLabel: "Md URL",
    title: "URL → Markdown",
    description: "Web pages and YouTube videos (transcript) into Markdown.",
    icon: Link2,
    cards: ["html"],
    mode: "url",
  },
]

export function getFormat(slug: string): ConvertFormat | undefined {
  return CONVERT_FORMATS.find((f) => f.slug === slug)
}

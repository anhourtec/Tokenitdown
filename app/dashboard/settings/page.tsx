import { LifeBuoy } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { getPreferences } from "@/lib/preferences"

import { SettingsForm } from "./_components/settings-form"

export const metadata = {
  title: "Settings · TokenItDown",
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const prefs = await getPreferences(session.user.id)

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">Your conversion defaults and preferences.</p>
      </div>
      <SettingsForm initial={prefs} name={session.user.name} email={session.user.email} />
      <div className="max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="text-base">Looking for something more?</CardTitle>
              <CardDescription>Open an issue or reach out on GitHub.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link
                href="https://github.com/anhourtec/tokenitdown"
                target="_blank"
                rel="noreferrer"
                aria-label="Open the TokenItDown repository on GitHub"
              >
                <LifeBuoy aria-hidden className="size-4" />
                GitHub
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

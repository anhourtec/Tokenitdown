import { headers } from "next/headers"
import { redirect } from "next/navigation"

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
    </div>
  )
}

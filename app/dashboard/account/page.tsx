import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

import { AccountForm } from "./_components/account-form"

export const metadata = {
  title: "Account · TokenItDown",
}

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-2xl tracking-tight">Account</h2>
        <p className="text-muted-foreground text-sm">Manage your profile, email and password.</p>
      </div>
      <AccountForm name={session.user.name} email={session.user.email} image={session.user.image ?? null} />
    </div>
  )
}

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { SignOutButton } from "../../components/SignOutButton/SignOutButton"
import { auth } from "../../lib/auth"

export const metadata = {
  title: "Dashboard · TokenItDown",
}

export default async function DashboardPage() {
  // Authoritative server-side session check. Middleware does an optimistic
  // cookie check; this validates the session against the database.
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">Signed in as</p>
        <p className="text-lg font-medium text-gray-900 dark:text-white">{session.user.name}</p>
        <p className="text-gray-600 dark:text-gray-400">{session.user.email}</p>
      </section>
    </main>
  )
}

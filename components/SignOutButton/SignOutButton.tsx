"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { signOut } from "../../lib/auth-client"

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-400 bg-transparent px-4 text-sm text-blue-400 transition-colors hover:enabled:bg-blue-400 hover:enabled:text-white disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  )
}

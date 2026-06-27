"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { signIn, signUp } from "../../lib/auth-client"

type Mode = "login" | "signup"

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"

/**
 * Shared email/password form for the login and signup routes. Talks to
 * better-auth via the browser auth client; on success it routes to /dashboard.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isSignup = mode === "signup"

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const { error: authError } = isSignup
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password })

    setPending(false)

    if (authError) {
      setError(authError.message ?? "Something went wrong. Please try again.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isSignup ? "Start turning documents into clean Markdown." : "Sign in to your TokenItDown account."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
            Name
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
          Password
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-400 bg-blue-400 px-6 text-lg text-white transition-colors hover:enabled:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Please wait…" : isSignup ? "Sign up" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-400 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-400 hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

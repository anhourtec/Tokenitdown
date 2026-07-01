"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { LoginOverlay } from "./login-overlay"

import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { PasswordInput } from "../../components/ui/password-input"
import { signIn, signUp } from "../../lib/auth-client"

type Mode = "login" | "register"

/**
 * Shared email/password form for the /login and /register routes, styled with
 * the shadcn/ui primitives. Talks to better-auth via the browser auth client;
 * on success it routes to /dashboard.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const isRegister = mode === "register"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<{ name: string; email: string; image: string | null } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isRegister) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
    }

    setPending(true)
    const result = isRegister
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password })
    setPending(false)

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.")
      return
    }

    const signedInUser = (result.data as { user?: { name?: string; image?: string | null } } | null)?.user
    setSuccess({
      name: isRegister ? name : (signedInUser?.name ?? ""),
      email,
      image: isRegister ? null : (signedInUser?.image ?? null),
    })
  }

  if (success) {
    return (
      <LoginOverlay
        name={success.name}
        email={success.email}
        image={success.image}
        mode={mode}
        onComplete={() => {
          router.push("/dashboard")
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Use the SVG directly (no next/image optimization). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/token-it-down.svg" alt="TokenItDown" className="mx-auto h-20 w-auto" />
        <h3 className="text-foreground mt-4 text-center text-lg font-bold">
          {isRegister ? "Create your TokenItDown account" : "Sign in to TokenItDown"}
        </h3>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          {isRegister
            ? "Start turning documents into clean Markdown."
            : "Welcome back — sign in to continue."}
        </p>
      </div>

      <Card className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Label htmlFor="name" className="text-foreground text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground text-sm font-medium">
                Password
              </Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={8}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                wrapperClassName="mt-2"
              />
            </div>

            {isRegister && (
              <div>
                <Label htmlFor="confirm-password" className="text-foreground text-sm font-medium">
                  Confirm password
                </Label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  wrapperClassName="mt-2"
                />
              </div>
            )}

            {isRegister && (
              // Hidden for now (kept in code for later).
              <div className="mt-2 hidden items-start">
                <div className="flex h-6 items-center">
                  <Checkbox id="newsletter" name="newsletter" className="size-4" />
                </div>
                <Label htmlFor="newsletter" className="text-muted-foreground ml-3 text-sm leading-6 font-normal">
                  Sign up to our newsletter
                </Label>
              </div>
            )}

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}

            <Button type="submit" disabled={pending} className="mt-2 w-full py-2 font-medium">
              {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </Button>

            {isRegister && (
              <p className="text-muted-foreground text-center text-xs">
                By creating an account, you agree to our{" "}
                <Link href="/" className="text-primary hover:text-primary/90 capitalize">
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link href="/" className="text-primary hover:text-primary/90 capitalize">
                  Privacy policy
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/90 font-medium">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:text-primary/90 font-medium">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

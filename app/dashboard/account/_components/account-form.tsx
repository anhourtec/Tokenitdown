"use client"

import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { changeEmail, changePassword, updateUser } from "@/lib/auth-client"
import { getInitials } from "@/lib/utils"

export function AccountForm({ name, email, image }: { name: string; email: string; image: string | null }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <ProfileCard name={name} image={image} />
      <EmailCard email={email} />
      <PasswordCard />
    </div>
  )
}

function ProfileCard({ name: initialName, image }: { name: string; image: string | null }) {
  const router = useRouter()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [name, setName] = React.useState(initialName)
  const [avatar, setAvatar] = React.useState<string | null>(image)
  const [savingName, setSavingName] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const onAvatarPicked = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/account/avatar", { method: "POST", body: form })
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(body?.error ?? "Upload failed")
      const url = `/api/account/avatar?v=${Date.now()}`
      const { error } = await updateUser({ image: url })
      if (error) throw new Error(error.message ?? "Could not save avatar")
      setAvatar(url)
      toast.success("Avatar updated")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const saveName = async () => {
    const trimmed = name.trim()
    if (!trimmed) return toast.error("Name can't be empty")
    setSavingName(true)
    try {
      const { error } = await updateUser({ name: trimmed })
      if (error) throw new Error(error.message ?? "Could not update name")
      toast.success("Name updated")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Your name and avatar across TokenItDown.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={avatar || undefined} alt={name} />
            <AvatarFallback className="text-lg">{getInitials(name || "?")}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Change avatar
            </Button>
            <p className="text-muted-foreground text-xs">PNG, JPEG, WEBP or GIF · up to 2 MB.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onAvatarPicked(f)
                e.target.value = ""
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="max-w-sm" />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-4">
        <Button onClick={() => void saveName()} disabled={savingName || name.trim() === initialName.trim()}>
          {savingName && <Loader2 className="size-4 animate-spin" />}
          Save name
        </Button>
      </CardFooter>
    </Card>
  )
}

function EmailCard({ email: initialEmail }: { email: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState(initialEmail)
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    const trimmed = email.trim()
    if (!trimmed || trimmed === initialEmail) return
    setSaving(true)
    try {
      const { error } = await changeEmail({ newEmail: trimmed, callbackURL: "/dashboard/account" })
      if (error) throw new Error(error.message ?? "Could not change email")
      toast.success("Email updated")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email</CardTitle>
        <CardDescription>The address you use to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="max-w-sm"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-4">
        <Button onClick={() => void save()} disabled={saving || email.trim() === initialEmail}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Update email
        </Button>
      </CardFooter>
    </Card>
  )
}

function PasswordCard() {
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const save = async () => {
    if (next.length < 8) return toast.error("New password must be at least 8 characters")
    if (next !== confirm) return toast.error("Passwords do not match")
    setSaving(true)
    try {
      const { error } = await changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: false })
      if (error) throw new Error(error.message ?? "Could not change password")
      toast.success("Password changed")
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const canSave = current.length > 0 && next.length >= 8 && next === confirm

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>Use a strong password you don&apos;t reuse elsewhere.</CardDescription>
      </CardHeader>
      <CardContent className="flex max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t pt-4">
        <Button onClick={() => void save()} disabled={!canSave || saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Change password
        </Button>
      </CardFooter>
    </Card>
  )
}

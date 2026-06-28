import { createAuthClient } from "better-auth/react"

/**
 * Browser auth client. With no baseURL it talks to the current origin's
 * `/api/auth/*` handler; override via NEXT_PUBLIC_BETTER_AUTH_URL when the
 * client must reach a different origin.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
})

export const { signIn, signUp, signOut, useSession, getSession, updateUser, changeEmail, changePassword } = authClient

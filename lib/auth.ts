import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db, schema } from "./db"
import { env } from "../env.mjs"

/**
 * Server-side better-auth instance.
 *
 * Baseline: email/password with httpOnly cookie sessions stored in Postgres via
 * the Drizzle adapter. CSRF is enforced by better-auth's trusted-origin check
 * (state-changing requests must originate from `trustedOrigins`). 2FA / email
 * verification / password reset are layered on top of this in a later pass.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    // 7-day sessions, refreshed once a day while active.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    // httpOnly + Secure (in prod) + SameSite=Lax cookies; nothing in localStorage.
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
      session_token: {
        attributes: {
          sameSite: "lax",
          httpOnly: true,
        },
      },
    },
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
  // nextCookies() must be the last plugin: it lets server actions set cookies.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session

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
    // Secure cookies require HTTPS — base it on the URL scheme, not NODE_ENV, so
    // a plain-HTTP LAN deploy (e.g. http://192.168.x.x:3030) still keeps sessions.
    // Put the app behind HTTPS in production for `Secure` cookies.
    // String() guards against env.BETTER_AUTH_URL being undefined during the
    // build (SKIP_ENV_VALIDATION) when this module is evaluated.
    useSecureCookies: String(env.BETTER_AUTH_URL).startsWith("https://"),
    cookies: {
      session_token: {
        attributes: {
          sameSite: "lax",
          httpOnly: true,
        },
      },
    },
  },
  // BETTER_AUTH_URL plus any extra origins (e.g. the LAN URL injected in dev so
  // others on the network can sign in).
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    ...(env.TRUSTED_ORIGINS?.split(",")
      .map((o: string) => o.trim())
      .filter(Boolean) ?? []),
  ],
  // nextCookies() must be the last plugin: it lets server actions set cookies.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session

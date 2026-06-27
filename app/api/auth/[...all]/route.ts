import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "../../../../lib/auth"

/**
 * Catch-all handler for all better-auth endpoints (sign-up, sign-in, sign-out,
 * session, etc.) under /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler(auth)

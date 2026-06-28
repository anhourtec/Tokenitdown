import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Optimistic auth guard. Checks for the presence of a valid session cookie and
 * redirects unauthenticated users away from protected routes. This is a fast
 * edge check only — the authoritative session validation happens in the route
 * itself (see app/dashboard/page.tsx) against the database.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}

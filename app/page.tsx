import { redirect } from "next/navigation"

// The product entry point is the dashboard. Unauthenticated users are bounced to
// /login by the dashboard layout / middleware.
export default function Home() {
  redirect("/dashboard")
}

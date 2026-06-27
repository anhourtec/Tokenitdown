import { AuthForm } from "../AuthForm"

export const metadata = {
  title: "Sign in · TokenItDown",
}

export default function LoginPage() {
  return <AuthForm mode="login" />
}

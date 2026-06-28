import { ThemeSwitcher } from "../dashboard/_components/header/theme-switcher"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      {children}
    </main>
  )
}

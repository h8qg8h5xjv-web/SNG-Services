import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser, isAdmin } from '@/lib/admin/auth'

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/providers', label: 'Providers' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/bookings', label: 'Bookings' },
]

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  if (!isAdmin(user)) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Not authorized</h1>
        <p className="mt-2 text-sm text-foreground/60">
          {user.email} is signed in but is not an admin. Ask an existing admin to
          set <code>app_metadata.is_admin = true</code> for this account.
        </p>
        <form action="/admin/auth/signout" method="post" className="mt-6">
          <button className="min-h-11 rounded-lg border border-black/15 px-4 dark:border-white/20">
            Sign out
          </button>
        </form>
      </main>
    )
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <span className="font-semibold">SNG Admin</span>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-foreground/70 hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/admin/auth/signout" method="post">
            <button className="text-sm text-foreground/60 hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  )
}

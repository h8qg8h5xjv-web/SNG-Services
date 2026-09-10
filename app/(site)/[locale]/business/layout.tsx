import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconInbox, IconLogout } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProviderIds, getNewRequestCount } from '@/lib/business/data'

export const dynamic = 'force-dynamic'

// Business cabinet shell: a slim nav with the new-requests badge. On the login
// screen (no session yet) it renders bare — the guard middleware lets those
// pages through unauthenticated.
export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('business')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const providerIds = user ? await getMyProviderIds() : []
  const signedIn = providerIds.length > 0
  const newCount = signedIn ? await getNewRequestCount() : 0

  if (!signedIn) return <>{children}</>

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-body font-semibold">{t('cabinet')}</span>
        <nav className="flex items-center gap-4">
          <Link
            href="/business/requests"
            className="flex min-h-11 items-center gap-2 text-body font-semibold text-teal-700"
          >
            <IconInbox className="h-5 w-5" stroke={1.5} />
            {t('nav.requests')}
            {newCount > 0 && (
              <span className="rounded-full bg-teal-700 px-2 py-0.5 text-meta font-semibold text-white">
                {newCount}
              </span>
            )}
          </Link>
          <form action={`/${locale}/business/auth/signout`} method="post">
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1 text-body text-slate-500 hover:text-slate-900"
              aria-label={t('signOut')}
            >
              <IconLogout className="h-5 w-5" stroke={1.5} />
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

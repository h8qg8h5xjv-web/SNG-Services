import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconLogout } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'
import { getMyProviderIds, getNewRequestCount } from '@/lib/business/data'
import CabinetTabs from '@/components/business/CabinetTabs'

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
      <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-body font-semibold">{t('cabinet')}</span>
          <form action={`/${locale}/business/auth/signout`} method="post">
            <button
              type="submit"
              className="flex min-h-11 items-center gap-1 text-body text-slate-500 hover:text-slate-900"
              aria-label={t('signOut')}
            >
              <IconLogout className="h-5 w-5" stroke={1.5} />
            </button>
          </form>
        </div>
        <CabinetTabs newCount={newCount} />
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

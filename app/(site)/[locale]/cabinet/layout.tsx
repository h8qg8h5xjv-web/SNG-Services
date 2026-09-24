import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconLogout } from '@tabler/icons-react'
import { getMyProviderIds, getNewRequestCount } from '@/lib/business/data'
import { getAccount } from '@/lib/cabinet/data'
import CabinetTabs from '@/components/cabinet/CabinetTabs'
import LoginBlock from '@/components/cabinet/LoginBlock'
import AutoLink from '@/components/cabinet/AutoLink'

export const dynamic = 'force-dynamic'

export default async function CabinetLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('cabinet')

  const account = await getAccount()
  const loggedIn = account !== null
  const providerIds = loggedIn ? await getMyProviderIds() : []
  const incomingCount = providerIds.length > 0 ? await getNewRequestCount() : 0

  return (
    <>
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-title font-extrabold tracking-tight">{t('title')}</h1>
          {loggedIn && (
            <form action={`/${locale}/cabinet/auth/signout`} method="post">
              <button
                type="submit"
                className="flex min-h-11 items-center gap-1 text-body text-slate-500 hover:text-slate-900"
                aria-label={t('signOut')}
              >
                <IconLogout className="h-5 w-5" stroke={1.5} />
              </button>
            </form>
          )}
        </div>

        {loggedIn && <AutoLink />}
        {!loggedIn && (
          <div className="mb-4">
            <LoginBlock />
          </div>
        )}

        <div className="mb-6">
          <CabinetTabs loggedIn={loggedIn} incomingCount={incomingCount} />
        </div>

        {children}
      </div>
    </>
  )
}

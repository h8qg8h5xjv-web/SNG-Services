import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconLogout } from '@tabler/icons-react'
import { getMyProviderIds, getNewRequestCount } from '@/lib/business/data'
import { getAccount } from '@/lib/cabinet/data'
import NightHeader from '@/components/site/NightHeader'
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
  const t = await getTranslations()

  const account = await getAccount()
  const loggedIn = account !== null
  const providerIds = loggedIn ? await getMyProviderIds() : []
  const incomingCount = providerIds.length > 0 ? await getNewRequestCount() : 0

  const greeting = !account
    ? t('cabinet2.guest')
    : account.name
      ? t('cabinet2.hello', { name: account.name })
      : account.email
        ? t('cabinet2.signedInAs', { email: account.email })
        : null

  return (
    <>
      <NightHeader>
        <div className="cab-head">
          <div>
            <h1 className="ph1">{t('cabinet.title')}</h1>
            {greeting && <p className="sub">{greeting}</p>}
          </div>
          {loggedIn && (
            <form action={`/${locale}/cabinet/auth/signout`} method="post">
              <button type="submit" className="btn btn-ghost btn-sm">
                <IconLogout stroke={1.75} aria-hidden="true" />
                {t('cabinet.signOut')}
              </button>
            </form>
          )}
        </div>
      </NightHeader>

      <div className="wrap page pt-8">
        {loggedIn && <AutoLink />}
        {!loggedIn && <LoginBlock />}
        <CabinetTabs loggedIn={loggedIn} incomingCount={incomingCount} />
        {children}
      </div>
    </>
  )
}

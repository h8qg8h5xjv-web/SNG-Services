import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getAccount } from '@/lib/cabinet/data'
import ClaimCard from '@/components/cabinet/ClaimCard'

export const dynamic = 'force-dynamic'

// Invite claim: the master opens the admin-generated link. Signed in → the claim
// runs; signed out → the login prompt (in the layout) shows and they reopen it.
export default async function CabinetClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  const t = await getTranslations('cabinet.claim')
  const account = await getAccount()

  return (
    <section className="grid gap-3" aria-labelledby="claim-h">
      <h2 id="claim-h" className="h3">
        {t('title')}
      </h2>
      {!token ? (
        <p className="msg-err-inline">{t('invalid')}</p>
      ) : !account ? (
        <p className="muted">{t('needLogin')}</p>
      ) : (
        <ClaimCard token={token} />
      )}
    </section>
  )
}

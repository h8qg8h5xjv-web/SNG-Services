import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SectionHeading } from '@/components/ui/Section'
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
    <div>
      <SectionHeading>{t('title')}</SectionHeading>
      {!token ? (
        <p className="text-body text-red-700">{t('invalid')}</p>
      ) : !account ? (
        <p className="text-body text-slate-500">{t('needLogin')}</p>
      ) : (
        <ClaimCard token={token} />
      )}
    </div>
  )
}

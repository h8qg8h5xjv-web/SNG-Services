import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviderIds, getBusinessRequests } from '@/lib/business/data'
import { getAccount } from '@/lib/cabinet/data'
import { SectionHeading } from '@/components/ui/Section'
import MyRequests from '@/components/requests/MyRequests'
import RequestCard from '@/components/business/RequestCard'

export const dynamic = 'force-dynamic'

export default async function CabinetRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('cabinet')

  const account = await getAccount()
  const hasCards = account ? (await getMyProviderIds()).length > 0 : false
  const incoming = hasCards ? await getBusinessRequests() : []
  const activeIncoming = incoming.filter((r) => r.active)
  const answeredIncoming = incoming.filter((r) => !r.active)

  return (
    <div className="space-y-8">
      {hasCards && incoming.length > 0 && (
        <section className="space-y-3">
          <SectionHeading>{t('incoming')}</SectionHeading>
          {activeIncoming.map((r) => (
            <RequestCard key={r.requestId} request={r} locale={locale} />
          ))}
          {answeredIncoming.map((r) => (
            <RequestCard key={r.requestId} request={r} locale={locale} />
          ))}
        </section>
      )}

      <section>
        <SectionHeading>{t('myRequests')}</SectionHeading>
        <MyRequests />
      </section>
    </div>
  )
}

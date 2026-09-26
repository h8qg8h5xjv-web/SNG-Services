import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviderIds, getBusinessRequests } from '@/lib/business/data'
import { getAccount } from '@/lib/cabinet/data'
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
    <div>
      {hasCards && incoming.length > 0 && (
        <section className="cab-sec" aria-labelledby="inbox-h">
          <h2 id="inbox-h" className="h3">
            {t('incoming')}
          </h2>
          <ul className="inbox">
            {activeIncoming.map((r) => (
              <RequestCard key={r.requestId} request={r} locale={locale} />
            ))}
            {answeredIncoming.map((r) => (
              <RequestCard key={r.requestId} request={r} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      <section className="cab-sec" aria-labelledby="my-rq-h">
        <h2 id="my-rq-h" className="h3">
          {t('myRequests')}
        </h2>
        <MyRequests />
      </section>
    </div>
  )
}

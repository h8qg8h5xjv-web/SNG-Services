import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconInbox } from '@tabler/icons-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { getBusinessRequests } from '@/lib/business/data'
import RequestCard from '@/components/business/RequestCard'

export const dynamic = 'force-dynamic'

export default async function BusinessRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('business')
  const requests = await getBusinessRequests()
  const active = requests.filter((r) => r.active)
  const answered = requests.filter((r) => !r.active)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-title font-semibold">{t('nav.requests')}</h1>
        <p className="text-meta text-slate-500">{t('requestsIntro')}</p>
      </div>

      {requests.length === 0 && <EmptyState icon={IconInbox} text={t('noRequests')} />}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h2 font-semibold">{t('activeHeading')}</h2>
          {active.map((r) => (
            <RequestCard key={r.requestId} request={r} locale={locale} />
          ))}
        </section>
      )}

      {answered.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-slate-500">{t('answeredHeading')}</h2>
          {answered.map((r) => (
            <RequestCard key={r.requestId} request={r} locale={locale} />
          ))}
        </section>
      )}
    </div>
  )
}

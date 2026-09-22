import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviderIds, getCabinetBookings } from '@/lib/business/data'
import { getAccount, getContactedProviders } from '@/lib/cabinet/data'
import { SectionHeading } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Link } from '@/i18n/navigation'
import MyBookings from '@/components/profile/MyBookings'
import { dateTimeFormat } from '@/lib/intl'

export const dynamic = 'force-dynamic'

const TONE: Record<string, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  pending: 'neutral',
  cancelled: 'error',
}

export default async function CabinetBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('cabinet')
  const tb = await getTranslations('business.bookings')

  const account = await getAccount()
  const hasCards = account ? (await getMyProviderIds()).length > 0 : false
  const [onCards, contacted] = await Promise.all([
    hasCards ? getCabinetBookings() : Promise.resolve([]),
    account ? getContactedProviders() : Promise.resolve([]),
  ])

  const dtf = dateTimeFormat(locale, {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading>{t('myBookings')}</SectionHeading>
        <MyBookings />
      </section>

      {hasCards && onCards.length > 0 && (
        <section>
          <SectionHeading>{t('bookingsOnMyCards')}</SectionHeading>
          <div className="space-y-2">
            {onCards.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-body font-semibold">{dtf.format(new Date(b.startsAt))}</span>
                  <StatusBadge tone={TONE[b.status] ?? 'neutral'}>{tb(`status.${b.status}`)}</StatusBadge>
                </div>
                {b.serviceName && <p className="text-meta text-slate-500">{b.serviceName}</p>}
                <p className="mt-1 text-body">{b.customerName}</p>
                <p className="text-meta text-slate-500">
                  {[b.customerPhone, b.customerEmail].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {contacted.length > 0 && (
        <section>
          <SectionHeading>{t('contacted')}</SectionHeading>
          <div className="space-y-2">
            {contacted.map((c) => (
              <Link
                key={c.slug}
                href={c.categorySlug ? `/${c.categorySlug}/${c.slug}` : '/'}
                className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-accent"
              >
                <span className="text-body font-semibold">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

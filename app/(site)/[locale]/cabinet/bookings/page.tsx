import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconChevronRight } from '@tabler/icons-react'
import { getMyProviderIds, getCabinetBookings } from '@/lib/business/data'
import { getAccount, getContactedProviders } from '@/lib/cabinet/data'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pane } from '@/components/ui/Pane'
import { Link } from '@/i18n/navigation'
import MyBookings from '@/components/profile/MyBookings'
import { dateTimeFormat } from '@/lib/intl'

export const dynamic = 'force-dynamic'

const TONE: Record<string, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  pending: 'neutral',
  cancelled: 'error',
}

const TZ = 'Europe/London'

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

  const time = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const day = dateTimeFormat(locale, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div>
      <section className="cab-sec" aria-labelledby="my-bk-h">
        <h2 id="my-bk-h" className="h3">
          {t('myBookings')}
        </h2>
        <MyBookings />
      </section>

      {hasCards && onCards.length > 0 && (
        <section className="cab-sec" aria-labelledby="cards-bk-h">
          <h2 id="cards-bk-h" className="h3">
            {t('bookingsOnMyCards')}
          </h2>
          <ul className="bl">
            {onCards.map((b) => {
              const start = new Date(b.startsAt)
              return (
                <li key={b.id} className={`card bitem ${b.status === 'cancelled' ? 'past' : ''}`}>
                  <Pane off time={time.format(start)} />
                  <div>
                    <b>{b.customerName}</b>
                    <span className="muted">
                      {[day.format(start), b.serviceName].filter(Boolean).join(' · ')}
                    </span>
                    <span className="muted block">
                      {[b.customerPhone, b.customerEmail].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="acts">
                    <StatusBadge tone={TONE[b.status] ?? 'neutral'}>{tb(`status.${b.status}`)}</StatusBadge>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {contacted.length > 0 && (
        <section className="cab-sec" aria-labelledby="contacted-h">
          <h2 id="contacted-h" className="h3">
            {t('contacted')}
          </h2>
          <ul className="bl">
            {contacted.map((c) => (
              <li key={c.slug} className="card crow">
                <b>
                  <Link href={c.categorySlug ? `/${c.categorySlug}/${c.slug}` : '/'} className="cover">
                    {c.name}
                  </Link>
                </b>
                <IconChevronRight stroke={1.75} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

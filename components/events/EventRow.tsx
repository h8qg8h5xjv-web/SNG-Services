import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Attendance from '@/components/events/Attendance'
import { formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { pickEventTitle, eventCategorySlug } from '@/lib/events/constants'
import type { EventListItem } from '@/lib/queries/events'
import type { EventAttendance } from '@/lib/events/attendance'

const TZ = 'Europe/London'

// Event row (DEMO_MAP §4): an arched dusk date block, the title (its link
// covers the row), type · time · area, who's going; the price on the right.
export default function EventRow({
  event,
  locale,
  attendance,
}: {
  event: EventListItem
  locale: string
  attendance?: EventAttendance
}) {
  const t = useTranslations()
  const start = new Date(event.starts_at)
  const day = dateTimeFormat(locale, { timeZone: TZ, day: 'numeric' }).format(start)
  const month = dateTimeFormat(locale, { timeZone: TZ, month: 'short' }).format(start).replace('.', '')
  const weekday = dateTimeFormat(locale, { timeZone: TZ, weekday: 'short' }).format(start)
  const time = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(start)
  const free = event.price_from_pence == null

  return (
    <li className="card erow" data-key={event.slug}>
      <div className="edate" aria-hidden="true">
        <b>{day}</b>
        <span>
          {month} · {weekday}
        </span>
      </div>
      <div>
        <h3>
          <Link href={`/events/${event.slug}`}>{pickEventTitle(event, locale)}</Link>
        </h3>
        <p className="rmeta">
          <span>{t(`eventCategory.${eventCategorySlug(event.category)}`)}</span>
          <span>{time}</span>
          {(event.venue_name || event.borough) && <span>{[event.venue_name, event.borough].filter(Boolean).join(', ')}</span>}
        </p>
        {attendance && attendance.total > 0 && (
          <div className="mt-2">
            <Attendance data={attendance} />
          </div>
        )}
      </div>
      <div className="eside">
        <span className="eprice">
          {free ? t('events.free') : t('events2.priceFrom', { price: formatPrice(event.price_from_pence!) })}
        </span>
        <Link href={`/events/${event.slug}`} className="btn btn-line btn-sm" tabIndex={-1} aria-hidden="true">
          {t('events2.details')}
        </Link>
      </div>
    </li>
  )
}

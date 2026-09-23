import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { pickEventTitle } from '@/lib/events/constants'
import { resolveImageUrl } from '@/lib/images'
import { Card } from '@/components/ui/Card'
import Tilt from '@/components/Tilt'
import Reveal from '@/components/Reveal'
import Attendance from '@/components/events/Attendance'
import type { EventListItem } from '@/lib/queries/events'
import type { EventAttendance } from '@/lib/events/attendance'

const TZ = 'Europe/London'

// Event card (§7): photo on top with a date chip (top-left) and price (top-right),
// then the title and meta in a light body BELOW the image. The ONE Card component
// (DESIGN-SYSTEM §5). Wrapped in Reveal (scroll-in) and Tilt (hover).
export default function EventCard({
  event,
  locale,
  attendance,
}: {
  event: EventListItem
  locale: string
  attendance?: EventAttendance
}) {
  const t = useTranslations()
  const title = pickEventTitle(event, locale)
  const start = new Date(event.starts_at)
  const day = dateTimeFormat(locale, { timeZone: TZ, day: 'numeric' }).format(start)
  const month = dateTimeFormat(locale, { timeZone: TZ, month: 'short' }).format(start)
  const time = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(start)
  const meta = [time, event.borough].filter(Boolean).join(' · ')
  const cover = resolveImageUrl(event.cover_image)
  const free = event.price_from_pence == null

  return (
    <Reveal className="h-full">
      <Tilt perspective="far" maxDeg={4} translateZ={14} className="h-full">
        <Card href={`/events/${event.slug}`} className="block h-full overflow-hidden">
          <div className="relative aspect-video w-full overflow-hidden">
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="tilt-cover object-cover"
              />
            ) : (
              // No cover: an accent gradient instead of a grey box (task §5).
              <div className="tilt-cover h-full w-full bg-linear-to-br from-accent to-accent-soft" />
            )}

            <span className="absolute left-3 top-3 rounded-lg bg-white px-2 py-1 text-center leading-none">
              <span className="block text-body font-semibold text-slate-900">{day}</span>
              <span className="block text-label text-slate-500">{month}</span>
            </span>

            <span className="absolute right-3 top-3">
              {free ? (
                <span className="rounded-full bg-green-100 px-2 py-1 text-meta font-semibold text-green-700">
                  {t('events.free')}
                </span>
              ) : (
                <span className="rounded-full bg-white px-2 py-1 text-meta font-semibold text-slate-900">
                  {t('catalog.from')} {formatPrice(event.price_from_pence!)}
                </span>
              )}
            </span>
          </div>

          {/* Text under the image (§7). */}
          <div className="p-3">
            <h3 className="text-body font-semibold text-slate-900">{title}</h3>
            {meta && <p className="mt-0.5 text-meta text-slate-500">{meta}</p>}
            {attendance && attendance.total > 0 && (
              <div className="mt-1.5">
                <Attendance data={attendance} />
              </div>
            )}
          </div>
        </Card>
      </Tilt>
    </Reveal>
  )
}

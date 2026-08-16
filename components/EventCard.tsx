import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/format'
import { formatEventDateTime } from '@/lib/events/format'
import { pickEventTitle } from '@/lib/events/constants'
import { Card, CardMedia, CardBody } from '@/components/ui/Card'
import type { EventListItem } from '@/lib/queries/events'

export default function EventCard({
  event,
  locale,
}: {
  event: EventListItem
  locale: string
}) {
  const t = useTranslations()
  const title = pickEventTitle(event, locale)
  const place = [event.venue_name, event.borough].filter(Boolean).join(', ')

  return (
    <Card href={`/events/${event.slug}`} className="flex flex-col">
      <CardMedia
        src={event.cover_image}
        ratio="video"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <CardBody className="flex flex-1 flex-col gap-1">
        <p className="text-meta font-semibold text-slate-500">
          {formatEventDateTime(event.starts_at, locale)}
        </p>
        <h3 className="font-semibold">{title}</h3>
        {place && <p className="text-meta text-slate-500">{place}</p>}
        <p className="mt-1 text-meta font-semibold">
          {event.price_from_pence == null
            ? t('events.free')
            : `${t('catalog.from')} ${formatPrice(event.price_from_pence)}`}
        </p>
      </CardBody>
    </Card>
  )
}

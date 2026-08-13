import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { resolveImageUrl } from '@/lib/images'
import { formatPrice } from '@/lib/format'
import { formatEventDateTime } from '@/lib/events/format'
import { pickEventTitle } from '@/lib/events/constants'
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
  const image = resolveImageUrl(event.cover_image)
  const place = [event.venue_name, event.borough].filter(Boolean).join(', ')

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-black/10 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
    >
      <div className="relative aspect-[16/9] w-full bg-foreground/5">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-sm font-medium text-foreground/70">
          {formatEventDateTime(event.starts_at, locale)}
        </p>
        <h3 className="font-medium leading-snug">{title}</h3>
        {place && <p className="text-sm text-foreground/60">{place}</p>}
        <p className="mt-1 text-sm font-medium">
          {event.price_from_pence == null
            ? t('events.free')
            : `${t('catalog.from')} ${formatPrice(event.price_from_pence)}`}
        </p>
      </div>
    </Link>
  )
}

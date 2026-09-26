import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconExternalLink, IconMapPin, IconCalendarEvent, IconTag } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import JsonLd from '@/components/JsonLd'
import NightHeader from '@/components/site/NightHeader'
import EventRow from '@/components/events/EventRow'
import AddressMap from '@/components/map/AddressMap'
import { getEventBySlug, listUpcomingEvents } from '@/lib/queries/events'
import { getEventAttendance } from '@/lib/events/attendance'
import GoingButton from '@/components/events/GoingButton'
import {
  pickEventTitle,
  pickEventDescription,
  eventCategorySlug,
} from '@/lib/events/constants'
import { formatEventDateTime } from '@/lib/events/format'
import { formatPrice } from '@/lib/format'
import { resolveImageUrl } from '@/lib/images'

type Params = { locale: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return {}
  const description = pickEventDescription(event, locale)
  const image = resolveImageUrl(event.cover_image)
  return {
    title: pickEventTitle(event, locale),
    description: description?.slice(0, 160) ?? undefined,
    openGraph: {
      type: 'website',
      title: pickEventTitle(event, locale),
      description: description?.slice(0, 200) ?? undefined,
      images: image ? [image] : undefined,
    },
  }
}

export default async function EventPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const [attendance, upcoming] = await Promise.all([getEventAttendance(event.id), listUpcomingEvents()])
  const more = upcoming.filter((e) => e.id !== event.id).slice(0, 3)
  const t = await getTranslations()
  const title = pickEventTitle(event, locale)
  const description = pickEventDescription(event, locale)
  const image = resolveImageUrl(event.cover_image)
  const place = [event.venue_name, event.borough].filter(Boolean).join(', ')

  const eventLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    startDate: event.starts_at,
    ...(event.ends_at ? { endDate: event.ends_at } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    location: {
      '@type': 'Place',
      name: event.venue_name ?? place,
      address: {
        '@type': 'PostalAddress',
        ...(event.borough ? { addressLocality: event.borough } : {}),
        addressCountry: 'GB',
        ...(event.address ? { streetAddress: event.address } : {}),
      },
      ...(event.lat != null && event.lng != null
        ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } }
        : {}),
    },
    ...(event.ticket_url || event.price_from_pence != null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'GBP',
            price: (event.price_from_pence ?? 0) / 100,
            availability: 'https://schema.org/InStock',
            ...(event.ticket_url ? { url: event.ticket_url } : {}),
          },
        }
      : {}),
  }

  const free = event.price_from_pence == null
  const priceLabel = free ? t('events.free') : t('events2.priceFrom', { price: formatPrice(event.price_from_pence!) })
  const hasMap = event.lat != null && event.lng != null
  const tickets = event.ticket_url ? (
    <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" className="btn btn-amber">
      {t('events.tickets')}
      <IconExternalLink stroke={1.75} aria-hidden="true" />
    </a>
  ) : null

  return (
    <>
      <JsonLd data={eventLd} />
      <NightHeader>
        <nav className="crumbs" aria-label={t('listing.crumbsLabel')}>
          <Link href="/events">{t('events2.crumbs')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="ph1">{title}</h1>
        <p className="ev-facts">
          <span>
            <IconCalendarEvent stroke={1.75} aria-hidden="true" />
            {formatEventDateTime(event.starts_at, locale)}
          </span>
          {place && (
            <span>
              <IconMapPin stroke={1.75} aria-hidden="true" />
              {place}
            </span>
          )}
          <span>
            <IconTag stroke={1.75} aria-hidden="true" />
            {t(`eventCategory.${eventCategorySlug(event.category)}`)}
          </span>
        </p>
      </NightHeader>

      <div className={`wrap page ${tickets ? 'has-cta' : ''}`}>
        <div className="two pt-9">
          <div>
            {image && (
              <div className="ev-cover ph-media">
                <Image src={image} alt="" fill sizes="(max-width: 980px) 100vw, 60vw" className="object-cover" priority />
              </div>
            )}
            {description && <p className="ev-desc">{description}</p>}

            {event.organizer && event.organizer.categories && (
              <p className="lst-note">
                {t('events.organizer')}:{' '}
                <Link href={`/${event.organizer.categories.slug}/${event.organizer.slug}`} className="link">
                  {event.organizer.name_en}
                </Link>
              </p>
            )}

            {(hasMap || event.address || place) && (
              <section className="ev-sec" aria-labelledby="ev-where">
                <h2 id="ev-where" className="h3">
                  {t('events2.howToGet')}
                </h2>
                <div className="where">
                  {hasMap && <AddressMap lat={event.lat!} lng={event.lng!} />}
                  <div className="addr">
                    {hasMap ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=15/${event.lat}/${event.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconMapPin stroke={1.75} aria-hidden="true" />
                        {event.address ?? place}
                      </a>
                    ) : (
                      <span>
                        <IconMapPin stroke={1.75} aria-hidden="true" />
                        {event.address ?? place}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="card tix" aria-label={t('events2.entry')}>
            <div className="total-row">
              <span className="muted">{t('events2.entry')}</span>
              <b>{priceLabel}</b>
            </div>
            {tickets}
            {tickets && <p className="hint muted text-small">{t('events2.ticketsNote')}</p>}
            <hr />
            <p className="font-semibold" id="going">
              {t('events2.goingTitle')}
            </p>
            {/* Guest "I'm going" with who's going (initials only). No chat. */}
            <GoingButton eventId={event.id} initial={attendance} />
          </aside>
        </div>

        {more.length > 0 && (
          <section className="ev-sec" aria-labelledby="ev-more">
            <h2 id="ev-more" className="h3">
              {t('events2.more')}
            </h2>
            <ul className="evlist">
              {more.map((e) => (
                <EventRow key={e.id} event={e} locale={locale} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {tickets && (
        <div className="cta-bar">
          <div className="min-w-0">
            <b className="truncate">{title}</b>
            <span>{priceLabel}</span>
          </div>
          {tickets}
        </div>
      )}
    </>
  )
}

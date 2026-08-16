import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconExternalLink, IconMapPin, IconCalendarEvent } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import Header from '@/components/Header'
import JsonLd from '@/components/JsonLd'
import { getEventBySlug } from '@/lib/queries/events'
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

  const tickets = event.ticket_url ? (
    <a
      href={event.ticket_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 font-semibold text-white sm:w-auto"
    >
      {t('events.tickets')}
      <IconExternalLink className="h-4 w-4" stroke={2} />
    </a>
  ) : null

  return (
    <>
      <Header />
      <JsonLd data={eventLd} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 sm:pb-12">
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="py-5">
          <p className="text-body font-semibold text-slate-500">
            {t(`eventCategory.${eventCategorySlug(event.category)}`)} ·{' '}
            {formatEventDateTime(event.starts_at, locale)}
          </p>
          <h1 className="mt-1 text-title font-semibold">{title}</h1>
          {place && <p className="mt-1 text-slate-500">{place}</p>}
          <p className="mt-3 font-semibold">
            {event.price_from_pence == null
              ? t('events.free')
              : `${t('catalog.from')} ${formatPrice(event.price_from_pence)}`}
          </p>

          {description && (
            <p className="mt-4 whitespace-pre-line text-slate-900">
              {description}
            </p>
          )}

          {tickets && <div className="mt-6 hidden sm:block">{tickets}</div>}
        </div>

        {event.organizer && event.organizer.categories && (
          <section className="border-t border-slate-200 py-5">
            <h2 className="mb-2 text-body font-semibold text-slate-500">
              {t('events.organizer')}
            </h2>
            <Link
              href={`/${event.organizer.categories.slug}/${event.organizer.slug}`}
              className="inline-flex items-center gap-2 font-semibold hover:underline"
            >
              <IconCalendarEvent className="h-4 w-4" stroke={1.5} />
              {event.organizer.name_en}
            </Link>
          </section>
        )}

        {event.lat != null && event.lng != null && (
          <section className="border-t border-slate-200 py-5">
            <a
              href={`https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=15/${event.lat}/${event.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <IconMapPin className="h-4 w-4" stroke={1.5} />
              {event.address ?? place}
            </a>
          </section>
        )}
      </main>

      {tickets && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          {tickets}
        </div>
      )}
    </>
  )
}

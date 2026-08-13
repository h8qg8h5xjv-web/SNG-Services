import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  IconPhone,
  IconBrandTelegram,
  IconBrandInstagram,
  IconWorld,
  IconMapPin,
  IconExternalLink,
} from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import Header from '@/components/Header'
import ProviderHours from '@/components/ProviderHours'
import RecordRecentView from '@/components/RecordRecentView'
import EventCard from '@/components/EventCard'
import JsonLd from '@/components/JsonLd'
import { getProviderDetail } from '@/lib/queries/providers'
import { listEventsByOrganizer } from '@/lib/queries/events'
import { recordEvents } from '@/lib/tracking/events'
import { pickProviderContent } from '@/lib/i18n/content'
import { formatPrice, formatDuration } from '@/lib/format'
import { resolveImageUrl } from '@/lib/images'
import { platformName } from '@/lib/url'

type Params = { locale: string; category: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { locale, category, slug } = await params
  const provider = await getProviderDetail(category, slug)
  if (!provider) return {}
  const { name, description } = pickProviderContent(
    provider,
    provider.provider_translations,
    locale,
  )
  const image = resolveImageUrl(provider.cover_image)
  return {
    title: name,
    description: description.slice(0, 160),
    openGraph: {
      type: 'website',
      title: name,
      description: description.slice(0, 200),
      images: image ? [image] : undefined,
    },
  }
}

export default async function ProviderPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ from?: string }>
}) {
  const { locale, category, slug } = await params
  setRequestLocale(locale)

  const provider = await getProviderDetail(category, slug)
  if (!provider) notFound()

  // Log the visit as a click (surface = where it came from, else "provider").
  const { from } = await searchParams
  const surface = from === 'category' || from === 'search' ? from : 'provider'
  const sessionId = (await cookies()).get('sng_sid')?.value ?? null
  await recordEvents(
    [{ provider_id: provider.id, event_type: 'click', surface, locale }],
    sessionId,
  )

  const organizerEvents = await listEventsByOrganizer(provider.id)
  const t = await getTranslations()
  const { name, description } = pickProviderContent(
    provider,
    provider.provider_translations,
    locale,
  )
  const image = resolveImageUrl(provider.cover_image)
  const languages = provider.provider_languages
    .map((l) => l.languages?.name_native)
    .filter((n): n is string => Boolean(n))
  const isExternal = provider.fulfillment_type === 'external_order'
  const isNative = provider.fulfillment_type === 'native_booking'

  const durationLabels = { hour: t('units.hour'), min: t('units.min') }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const businessLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description,
    url: `${siteUrl}/${locale}/${category}/${slug}`,
    ...(image ? { image } : {}),
    ...(provider.phone ? { telephone: provider.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.borough,
      addressRegion: 'London',
      addressCountry: 'GB',
      ...(provider.address ? { streetAddress: provider.address } : {}),
    },
    ...(provider.lat != null && provider.lng != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: provider.lat,
            longitude: provider.lng,
          },
        }
      : {}),
  }

  // Primary CTA reused inline and in the mobile sticky bar.
  const cta = isNative ? (
    <Link
      href={`/${category}/${slug}/book`}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-foreground px-6 font-medium text-background sm:w-auto"
    >
      {t('provider.book')}
    </Link>
  ) : isExternal && provider.external_order_url ? (
    <a
      href={provider.external_order_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-6 font-medium text-background sm:w-auto"
    >
      {t('provider.orderOn', { platform: platformName(provider.external_order_url) })}
      <IconExternalLink className="h-4 w-4" stroke={2} />
    </a>
  ) : null

  return (
    <>
      <Header />
      <JsonLd data={businessLd} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 sm:pb-12">
        <RecordRecentView
          item={{
            slug: provider.slug,
            categorySlug: category,
            name,
            borough: provider.borough,
            coverImage: provider.cover_image,
          }}
        />

        <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-foreground/5">
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
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="mt-1 text-foreground/60">{provider.borough}</p>
          {languages.length > 0 && (
            // Reference line only — service languages are not a filter (DESIGN §1).
            <p className="mt-2 text-sm text-foreground/60">
              {t('provider.languagesServed')}: {languages.join(', ')}
            </p>
          )}
          <p className="mt-4 whitespace-pre-line text-foreground/80">{description}</p>

          {cta && <div className="mt-6 hidden sm:block">{cta}</div>}
        </div>

        {/* Services — hidden entirely for external_order (no prices shown at all). */}
        {!isExternal && provider.services.length > 0 && (
          <section className="border-t border-black/10 py-5 dark:border-white/10">
            <h2 className="mb-3 text-lg font-medium">{t('provider.services')}</h2>
            <ul className="divide-y divide-black/5 dark:divide-white/5">
              {provider.services.map((s) => {
                const serviceName =
                  locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{serviceName}</p>
                      <p className="text-sm text-foreground/60">
                        {formatDuration(s.duration_min, durationLabels)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-medium">
                      {formatPrice(s.price_pence)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {provider.schedules.length > 0 && (
          <section className="border-t border-black/10 py-5 dark:border-white/10">
            <h2 className="mb-3 text-lg font-medium">{t('provider.hours')}</h2>
            <ProviderHours schedules={provider.schedules} />
          </section>
        )}

        {/* Upcoming events organised by this provider (DESIGN §2а / §3). */}
        {organizerEvents.length > 0 && (
          <section className="border-t border-black/10 py-5 dark:border-white/10">
            <h2 className="mb-3 text-lg font-medium">{t('events.upcoming')}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {organizerEvents.map((event) => (
                <EventCard key={event.id} event={event} locale={locale} />
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-black/10 py-5 dark:border-white/10">
          <h2 className="mb-3 text-lg font-medium">{t('provider.contacts')}</h2>
          <ul className="space-y-2 text-sm">
            {provider.phone && (
              <li>
                <a href={`tel:${provider.phone}`} className="inline-flex items-center gap-2 hover:underline">
                  <IconPhone className="h-4 w-4" stroke={1.5} /> {provider.phone}
                </a>
              </li>
            )}
            {provider.telegram && (
              <li>
                <a
                  href={`https://t.me/${provider.telegram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <IconBrandTelegram className="h-4 w-4" stroke={1.5} /> {provider.telegram}
                </a>
              </li>
            )}
            {provider.instagram && (
              <li>
                <a
                  href={`https://instagram.com/${provider.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <IconBrandInstagram className="h-4 w-4" stroke={1.5} /> {provider.instagram}
                </a>
              </li>
            )}
            {provider.website && (
              <li>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <IconWorld className="h-4 w-4" stroke={1.5} /> {t('provider.website')}
                </a>
              </li>
            )}
            {(provider.address || (provider.lat != null && provider.lng != null)) && (
              <li>
                {provider.lat != null && provider.lng != null ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${provider.lat}&mlon=${provider.lng}#map=15/${provider.lat}/${provider.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    <IconMapPin className="h-4 w-4" stroke={1.5} />
                    {provider.address ?? provider.borough}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <IconMapPin className="h-4 w-4" stroke={1.5} /> {provider.address}
                  </span>
                )}
              </li>
            )}
          </ul>
          {provider.fulfillment_type === 'enquiry' && (
            <p className="mt-3 text-sm text-foreground/60">{t('provider.enquiryHint')}</p>
          )}
        </section>
      </main>

      {/* Mobile: booking/order CTA pinned to the bottom of the screen. */}
      {cta && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-black/10 bg-background/95 p-3 backdrop-blur sm:hidden dark:border-white/10">
          {cta}
        </div>
      )}
    </>
  )
}

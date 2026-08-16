import type { Metadata } from 'next'
import { SectionHeading } from '@/components/ui/Section'
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
  IconPhoto,
} from '@tabler/icons-react'
import { ButtonLink } from '@/components/ui/Button'
import Header from '@/components/Header'
import ProviderHours from '@/components/ProviderHours'
import OpeningHours from '@/components/site/OpeningHours'
import VenueGallery from '@/components/site/VenueGallery'
import RecordRecentView from '@/components/RecordRecentView'
import EventCard from '@/components/EventCard'
import JsonLd from '@/components/JsonLd'
import {
  getProviderDetail,
  serviceLanguageBadges,
  providerCredentials,
} from '@/lib/queries/providers'
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
  const image = resolveImageUrl(provider.venue_photos?.[0] ?? provider.cover_image)
  return {
    title: name,
    description: description?.slice(0, 160) ?? undefined,
    openGraph: {
      type: 'website',
      title: name,
      description: description?.slice(0, 200) ?? undefined,
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
  // A place's first venue photo is its cover (DESIGN); fall back to cover_image.
  const image = resolveImageUrl(provider.venue_photos?.[0] ?? provider.cover_image)
  const languages = serviceLanguageBadges(provider.provider_languages)
  const credentials = providerCredentials(provider)
  const isExternal = provider.fulfillment_type === 'external_order'
  // A place that opts out of bookings (booking_enabled=false) is a listing only.
  const isNative = provider.fulfillment_type === 'native_booking' && provider.booking_enabled

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
    <ButtonLink href={`/${category}/${slug}/book`} className="w-full sm:w-auto">
      {t('provider.book')}
    </ButtonLink>
  ) : isExternal && provider.external_order_url ? (
    <ButtonLink href={provider.external_order_url} external className="w-full sm:w-auto">
      {t('provider.orderOn', { platform: platformName(provider.external_order_url) })}
      <IconExternalLink className="h-5 w-5" stroke={2} />
    </ButtonLink>
  ) : null

  return (
    <>
      <Header />
      <JsonLd data={businessLd} />
      {/* pb-28: off-scale on purpose — clears the mobile sticky booking bar. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 sm:pb-8">
        <RecordRecentView
          item={{
            slug: provider.slug,
            categorySlug: category,
            name,
            borough: provider.borough,
            coverImage: provider.cover_image,
          }}
        />

        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          ) : (
            // No photo (e.g. an unclaimed place — we don't take others' images).
            // A calm placeholder, not a broken/loading-looking empty box.
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
              <IconPhoto className="h-10 w-10" stroke={1.5} />
              <span className="text-body">{name}</span>
            </div>
          )}
        </div>

        <div className="py-6">
          <h1 className="text-title font-semibold">{name}</h1>
          <p className="mt-1 text-slate-500">{provider.borough}</p>
          {languages.length > 0 && (
            // Reference line only — service languages are not a filter (DESIGN §1).
            // The badge is about the SERVICE ("service in X confirmed"), never
            // about the person — see DESIGN «Формулировки».
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-slate-500">
              <span>{t('provider.languagesServed')}:</span>
              {languages.map((l) =>
                l.verified ? (
                  <span
                    key={l.name}
                    title={t('provider.languageConfirmed', { language: l.name })}
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700"
                  >
                    {l.name}
                    <span aria-hidden>✓</span>
                    {l.professional && (
                      <span className="text-meta opacity-80">· {t('provider.languageProfessional')}</span>
                    )}
                  </span>
                ) : (
                  <span key={l.name} className="text-meta text-slate-400">
                    {l.name}
                  </span>
                ),
              )}
            </div>
          )}
          {(credentials.insuranceVerified || credentials.dbsVerified) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-body">
              {credentials.insuranceVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                  <span aria-hidden>✓</span>
                  {t('provider.insuranceVerified')}
                </span>
              )}
              {credentials.dbsVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                  <span aria-hidden>✓</span>
                  {t('provider.dbsVerified', { type: credentials.dbsType ?? '' })}
                </span>
              )}
            </div>
          )}
          {description && description.trim() && (
            <p className="mt-4 whitespace-pre-line text-slate-900">{description}</p>
          )}

          {cta && <div className="mt-6 hidden sm:block">{cta}</div>}
        </div>

        {/* Services — hidden entirely for external_order (no prices shown at all). */}
        {!isExternal && provider.services.length > 0 && (
          <section className="border-t border-slate-200 py-6">
            <SectionHeading>{t('provider.services')}</SectionHeading>
            <ul className="divide-y divide-slate-100">
              {provider.services.map((s) => {
                const serviceName =
                  locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold">{serviceName}</p>
                      <p className="text-body text-slate-500">
                        {formatDuration(s.duration_min, durationLabels)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-semibold">
                      {formatPrice(s.price_pence)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {provider.schedules.length > 0 && (
          <section className="border-t border-slate-200 py-6">
            <SectionHeading>{t('provider.hours')}</SectionHeading>
            <ProviderHours schedules={provider.schedules} />
          </section>
        )}

        {/* Place-only: informational opening hours + venue gallery (DESIGN §2в). */}
        {provider.entity_type === 'place' && (
          <div className="border-t border-slate-200">
            <OpeningHours hours={provider.opening_hours} locale={locale} />
            <VenueGallery photos={provider.venue_photos} />
          </div>
        )}

        {/* Upcoming events organised by this provider (DESIGN §2а / §3). */}
        {organizerEvents.length > 0 && (
          <section className="border-t border-slate-200 py-6">
            <SectionHeading>{t('events.upcoming')}</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {organizerEvents.map((event) => (
                <EventCard key={event.id} event={event} locale={locale} />
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-slate-200 py-6">
          <SectionHeading>{t('provider.contacts')}</SectionHeading>
          <ul className="space-y-2 text-body">
            {provider.phone && (
              <li>
                <a href={`tel:${provider.phone}`} className="inline-flex items-center gap-2 hover:underline">
                  <IconPhone className="h-5 w-5" stroke={1.5} /> {provider.phone}
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
                  <IconBrandTelegram className="h-5 w-5" stroke={1.5} /> {provider.telegram}
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
                  <IconBrandInstagram className="h-5 w-5" stroke={1.5} /> {provider.instagram}
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
                  <IconWorld className="h-5 w-5" stroke={1.5} /> {t('provider.website')}
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
                    <IconMapPin className="h-5 w-5" stroke={1.5} />
                    {provider.address ?? provider.borough}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <IconMapPin className="h-5 w-5" stroke={1.5} /> {provider.address}
                  </span>
                )}
              </li>
            )}
          </ul>
          {provider.fulfillment_type === 'enquiry' && (
            <p className="mt-3 text-body text-slate-500">{t('provider.enquiryHint')}</p>
          )}
        </section>
      </main>

      {/* Mobile: CTA pinned to the bottom. bottom-14 is off-scale on purpose —
          it sits just above the fixed bottom nav. */}
      {cta && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-slate-200 bg-white p-3 sm:hidden">
          {cta}
        </div>
      )}
    </>
  )
}

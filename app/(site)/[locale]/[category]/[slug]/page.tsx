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
  IconLanguage,
  IconCircleCheck,
} from '@tabler/icons-react'
import { ButtonLink } from '@/components/ui/Button'
import { InfoBlock } from '@/components/ui/InfoBlock'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import SaveHeart from '@/components/SaveHeart'
import OpenNowInline from '@/components/OpenNowInline'
import ProviderHours from '@/components/ProviderHours'
import OpeningHours from '@/components/site/OpeningHours'
import VenueGallery from '@/components/site/VenueGallery'
import RecordRecentView from '@/components/RecordRecentView'
import ContactButtons from '@/components/ContactButtons'
import EventCard from '@/components/EventCard'
import JsonLd from '@/components/JsonLd'
import {
  getProviderDetail,
  providerCredentials,
  verifiedLanguageSummary,
} from '@/lib/queries/providers'
import { listEventsByOrganizer } from '@/lib/queries/events'
import { recordEvents } from '@/lib/tracking/events'
import { pickProviderContent, pickCategoryName } from '@/lib/i18n/content'
import { formatPrice, formatDuration } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { parseOpeningHours } from '@/lib/hours'
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
  const credentials = providerCredentials(provider)
  // Verified, non-expired service languages → the trust InfoBlock (DESIGN §5).
  const verified = verifiedLanguageSummary(provider.provider_languages)
  const verifiedOn = verified.verifiedAt
    ? dateTimeFormat(locale, { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(verified.verifiedAt),
      )
    : null
  const langLabel =
    verified.names.length === 1
      ? t('trust.oneVerified', { lang: verified.names[0] })
      : verified.names.length > 1
        ? t('trust.manyVerified', { langs: verified.names.join(', ') })
        : null
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
  ) : provider.entity_type === 'pro' ? (
    // A pro without an instant schedule → the path is a request to this specific
    // master (REQUESTS 12.2), so the card always shows the available path.
    <ButtonLink
      href={`/request?category=${category}&provider=${slug}`}
      className="w-full sm:w-auto"
    >
      {t('request.askThisMaster')}
    </ButtonLink>
  ) : null

  return (
    <>
      <Header />
      <JsonLd data={businessLd} />
      {/* pb-cta: reserves room below content for the mobile CTA + floating nav. */}
      <main className={`mx-auto w-full max-w-3xl flex-1 px-4 ${cta ? 'pb-cta' : 'pb-8'} sm:pb-8`}>
        <RecordRecentView
          item={{
            slug: provider.slug,
            categorySlug: category,
            name,
            borough: provider.borough,
            coverImage: provider.cover_image,
          }}
        />

        {/* Full-width photo (~210px) with overlay controls (DESIGN §7). Full-bleed
            on mobile (-mx-4), inset + rounded on desktop. */}
        <div className="relative -mx-4 h-52 overflow-hidden bg-slate-100 sm:mx-0 sm:mt-4 sm:rounded-lg">
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
              <IconPhoto className="h-10 w-10" stroke={1.5} />
              <span className="text-body">{name}</span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <BackButton floating />
          </div>
          <SaveHeart big slug={provider.slug} />
          {(provider.venue_photos?.length ?? 0) > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2 py-1 text-meta font-semibold text-white">
              {t('provider.photoCount', { current: 1, total: provider.venue_photos!.length })}
            </span>
          )}
        </div>

        <div className="py-6">
          <h1 className="text-name font-extrabold tracking-tight">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-slate-500">
            <span>{[provider.categories ? pickCategoryName(provider.categories, locale) : '', provider.borough].filter(Boolean).join(' · ')}</span>
            {provider.entity_type === 'place' && provider.opening_hours != null && (
              <>
                <span aria-hidden>·</span>
                <OpenNowInline hours={parseOpeningHours(provider.opening_hours)} />
              </>
            )}
          </p>

          {/* Trust, not rating (DESIGN §5): verified service language + when. */}
          {langLabel && (
            <div className="mt-4">
              <InfoBlock
                icon={IconLanguage}
                title={langLabel}
                subtitle={verifiedOn ? t('trust.checkedOn', { date: verifiedOn }) : t('trust.checkedByUs')}
              />
            </div>
          )}

          {(credentials.insuranceVerified || credentials.dbsVerified) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-body">
              {credentials.insuranceVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                  <IconCircleCheck className="h-5 w-5" stroke={2} />
                  {t('provider.insuranceVerified')}
                </span>
              )}
              {credentials.dbsVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                  <IconCircleCheck className="h-5 w-5" stroke={2} />
                  {t('provider.dbsVerified', { type: credentials.dbsType ?? '' })}
                </span>
              )}
            </div>
          )}
          {description && description.trim() && (
            <p className="mt-4 whitespace-pre-line text-slate-900">{description}</p>
          )}

          {/* Honest source note for cards entered from public data (idea #7). */}
          {provider.claim_status === 'unclaimed' && (
            <p className="mt-4 text-meta text-slate-400">{t('provider.unclaimed')}</p>
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
          <div className="mb-4">
            <ContactButtons
              providerId={provider.id}
              locale={locale}
              phone={provider.phone}
              website={provider.website}
            />
          </div>
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

      {/* Mobile: CTA pinned above the floating bottom nav (DESIGN §3/§7). */}
      {cta && (
        <div className="cta-above-nav fixed inset-x-3 z-20 rounded-full sm:hidden">
          {cta}
        </div>
      )}
    </>
  )
}

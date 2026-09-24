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
  IconLanguage,
  IconCircleCheck,
  IconBrandWhatsapp,
  IconHome,
  IconPhoto,
} from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import SaveHeart from '@/components/SaveHeart'
import OpenNowInline from '@/components/OpenNowInline'
import ProviderHours from '@/components/ProviderHours'
import OpeningHours from '@/components/site/OpeningHours'
import RecordRecentView from '@/components/RecordRecentView'
import ContactButtons from '@/components/ContactButtons'
import AddressMap from '@/components/map/AddressMap'
import EventCard from '@/components/EventCard'
import JsonLd from '@/components/JsonLd'
import ListingWeek from '@/components/booking/ListingWeek'
import {
  getProviderDetail,
  providerCredentials,
  verifiedLanguageSummary,
  serviceLanguageBadges,
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

// Listing (DEMO_MAP §3.2): gallery, name, facts, trust badges from real data,
// services, where & when, the organiser's events, contacts; the aside holds the
// real free windows (or the right non-booking action); a CTA bar on phones.
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
  const categoryName = provider.categories ? pickCategoryName(provider.categories, locale) : ''
  const photos = [
    ...(provider.venue_photos ?? []),
    ...(!provider.venue_photos?.length && provider.cover_image ? [provider.cover_image] : []),
  ]
    .map((p) => resolveImageUrl(p))
    .filter((u): u is string => Boolean(u))
  const image = photos[0] ?? null
  const credentials = providerCredentials(provider)
  const verified = verifiedLanguageSummary(provider.provider_languages)
  const verifiedOn = verified.verifiedAt
    ? dateTimeFormat(locale, { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(verified.verifiedAt),
      )
    : null
  const languageNames = serviceLanguageBadges(provider.provider_languages).map((l) => l.name)
  const isExternal = provider.fulfillment_type === 'external_order'
  // A place that opts out of bookings (booking_enabled=false) is a listing only.
  const isNative =
    provider.fulfillment_type === 'native_booking' && provider.booking_enabled && provider.services.length > 0
  const durationLabels = { hour: t('units.hour'), min: t('units.min') }
  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const todayDow = new Date(`${todayIso}T12:00:00Z`).getUTCDay()
  const base = `/${category}/${slug}`

  const priceFrom =
    !isExternal && provider.services.length > 0
      ? Math.min(...provider.services.map((s) => s.price_pence))
      : null
  const waNumber = provider.phone ? provider.phone.replace(/[^0-9]/g, '') : ''
  const waText = t('provider.whatsappText', { name })
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` : null
  const hasMap = provider.lat != null && provider.lng != null
  const hasContacts = Boolean(
    provider.phone || provider.telegram || provider.instagram || provider.website || provider.address || hasMap,
  )

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
    ...(hasMap
      ? { geo: { '@type': 'GeoCoordinates', latitude: provider.lat, longitude: provider.lng } }
      : {}),
  }

  const services = provider.services.map((s) => ({
    id: s.id,
    name: locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en,
    durationMin: s.duration_min,
    pricePence: s.price_pence,
    capacity: s.capacity,
  }))

  // The primary action for non-booking providers (also in the phone CTA bar).
  const altCta =
    isExternal && provider.external_order_url ? (
      <a href={provider.external_order_url} target="_blank" rel="noopener noreferrer" className="btn btn-amber">
        {t('provider.orderOn', { platform: platformName(provider.external_order_url) })}
        <IconExternalLink stroke={1.75} aria-hidden="true" />
      </a>
    ) : !isNative && provider.entity_type === 'pro' ? (
      // A pro without an instant schedule → a request to this specific master.
      <Link href={`/request?category=${category}&provider=${slug}`} className="btn btn-amber">
        {t('request.askThisMaster')}
      </Link>
    ) : null

  return (
    <div className={`wrap page ${isNative || altCta ? 'has-cta' : ''}`}>
      <JsonLd data={businessLd} />
      <RecordRecentView
        item={{ slug: provider.slug, categorySlug: category, name, borough: provider.borough, coverImage: provider.cover_image }}
      />
      <nav className="crumbs" aria-label={t('listing.crumbsLabel')}>
        <Link href="/">{t('listing.catalog')}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/${category}`}>{categoryName}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{name}</span>
      </nav>

      <div className="lst">
        <div>
          {/* Real photos; an honest dusk placeholder when there are none. */}
          <div className={`gal ${photos.length < 3 ? 'one' : ''}`}>
            {photos.length === 0 ? (
              <div className="ph">
                <span className="ph-name">{name}</span>
                <span className="ph-arches" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <IconPhoto stroke={1.5} aria-hidden="true" />
                {t('listing.noPhotos')}
              </div>
            ) : (
              photos.slice(0, photos.length < 3 ? 1 : 3).map((src, i) => (
                <div key={src} className="ph-media">
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes={i === 0 ? '(max-width: 980px) 100vw, 60vw' : '(max-width: 980px) 50vw, 25vw'}
                    className="object-cover"
                    priority={i === 0}
                  />
                  {i === 0 && photos.length > 3 && (
                    <span className="gal-count">{t('provider.photoCount', { current: 1, total: photos.length })}</span>
                  )}
                </div>
              ))
            )}
          </div>

          <h1 className="ph1">{name}</h1>
          <p className="lst-meta">
            <span>
              {categoryName} · {provider.borough}
            </span>
            {priceFrom != null && (
              <>
                <span className="dot-sep" aria-hidden="true" />
                <span>{t('listing.from', { price: formatPrice(priceFrom) })}</span>
              </>
            )}
            {provider.entity_type === 'place' && provider.opening_hours != null && (
              <>
                <span className="dot-sep" aria-hidden="true" />
                <OpenNowInline hours={parseOpeningHours(provider.opening_hours)} />
              </>
            )}
          </p>

          <div className="badges">
            {verified.names.length > 0 && (
              <span className="pill">
                <IconLanguage stroke={1.75} aria-hidden="true" />
                {t('listing.langChecked')}
              </span>
            )}
            {credentials.insuranceVerified && (
              <span className="pill">
                <IconCircleCheck stroke={1.75} aria-hidden="true" />
                {t('provider.insuranceVerified')}
              </span>
            )}
            {credentials.dbsVerified && (
              <span className="pill">
                <IconCircleCheck stroke={1.75} aria-hidden="true" />
                {t('provider.dbsVerified', { type: credentials.dbsType ?? '' })}
              </span>
            )}
            {provider.travels_to_client && (
              <span className="pill">
                <IconHome stroke={1.75} aria-hidden="true" />
                {t('listing.travels')}
              </span>
            )}
          </div>

          {description && description.trim() && <p className="lst-desc">{description}</p>}

          {languageNames.length > 0 && (
            <p className="lst-note">
              {t('listing.languages', { langs: languageNames.join(', ') })}
              {verified.names.length > 0 &&
                ` · ${verifiedOn ? t('trust.checkedOn', { date: verifiedOn }) : t('trust.checkedByUs')}`}
            </p>
          )}

          {provider.claim_status === 'unclaimed' && (
            <p className="lst-note">
              {t('provider.unclaimed')}{' '}
              <Link href="/for-business" className="link">
                {t('provider.claimCta')}
              </Link>
            </p>
          )}

          {!isExternal && (
            <section aria-labelledby="svc-h">
              <h2 id="svc-h" className="h3">
                {t('provider.services')}
              </h2>
              {services.length === 0 ? (
                <p className="muted">{t('provider.servicesUnknown')}</p>
              ) : (
                <ul className="svc">
                  {services.map((s) => (
                    <li key={s.id}>
                      <span>
                        <b>{s.name}</b>
                        <small>{formatDuration(s.durationMin, durationLabels)}</small>
                      </span>
                      <span className="price">{formatPrice(s.pricePence)}</span>
                      {isNative && (
                        <Link href={`${base}/book?svc=${encodeURIComponent(s.id)}`} className="btn btn-line btn-sm">
                          {t('listing.choose')}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(provider.schedules.length > 0 || hasMap || provider.entity_type === 'place') && (
            <section aria-labelledby="where-h">
              <h2 id="where-h" className="h3">
                {t('listing.whereWhen')}
              </h2>
              <div className="where">
                {hasMap ? <AddressMap lat={provider.lat!} lng={provider.lng!} /> : null}
                <div>
                  {provider.schedules.length > 0 && <ProviderHours schedules={provider.schedules} today={todayDow} />}
                  {provider.entity_type === 'place' && <OpeningHours hours={provider.opening_hours} locale={locale} />}
                </div>
              </div>
            </section>
          )}

          {organizerEvents.length > 0 && (
            <section aria-labelledby="ev-h">
              <h2 id="ev-h" className="h3">
                {t('events.upcoming')}
              </h2>
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                {organizerEvents.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            </section>
          )}

          {(hasContacts || provider.fulfillment_type === 'enquiry') && (
            <section aria-labelledby="contacts-h">
              <h2 id="contacts-h" className="h3">
                {t('provider.contacts')}
              </h2>
              <ContactButtons
                providerId={provider.id}
                locale={locale}
                phone={provider.phone}
                website={provider.website}
                waText={waText}
              />
              <div className="addr">
                {provider.phone && (
                  <a href={`tel:${provider.phone}`}>
                    <IconPhone stroke={1.75} aria-hidden="true" /> {provider.phone}
                  </a>
                )}
                {provider.telegram && (
                  <a href={`https://t.me/${provider.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                    <IconBrandTelegram stroke={1.75} aria-hidden="true" /> {provider.telegram}
                  </a>
                )}
                {provider.instagram && (
                  <a
                    href={`https://instagram.com/${provider.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconBrandInstagram stroke={1.75} aria-hidden="true" /> {provider.instagram}
                  </a>
                )}
                {provider.website && (
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    <IconWorld stroke={1.75} aria-hidden="true" /> {t('provider.website')}
                  </a>
                )}
                {(provider.address || hasMap) &&
                  (hasMap ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${provider.lat}&mlon=${provider.lng}#map=15/${provider.lat}/${provider.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconMapPin stroke={1.75} aria-hidden="true" />
                      {provider.address ?? provider.borough}
                    </a>
                  ) : (
                    <span>
                      <IconMapPin stroke={1.75} aria-hidden="true" /> {provider.address}
                    </span>
                  ))}
              </div>
              {provider.fulfillment_type === 'enquiry' && <p className="lst-note">{t('provider.enquiryHint')}</p>}
            </section>
          )}
        </div>

        {isNative ? (
          <ListingWeek base={base} slug={provider.slug} services={services} todayIso={todayIso} />
        ) : (
          <aside className="card week" aria-labelledby="alt-h">
            <h2 id="alt-h" className="h3">
              {t('listing.otherWays')}
            </h2>
            {!isExternal && <p className="week-sub">{t('provider.enquiryHint')}</p>}
            <div className="week-cta">
              {altCta}
              <SaveHeart slug={provider.slug} variant="inline" />
            </div>
          </aside>
        )}
      </div>

      {(isNative || altCta) && (
        <div className="cta-bar">
          <div className="min-w-0">
            <b className="truncate">{name}</b>
            {priceFrom != null && <span>{t('listing.from', { price: formatPrice(priceFrom) })}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label={t('provider.message')} className="icon-btn lined">
                <IconBrandWhatsapp stroke={1.75} aria-hidden="true" />
              </a>
            )}
            {isNative ? (
              <Link href={`${base}/book`} className="btn btn-amber btn-sm">
                {t('listing.bookCta')}
              </Link>
            ) : (
              altCta
            )}
          </div>
        </div>
      )}
    </div>
  )
}

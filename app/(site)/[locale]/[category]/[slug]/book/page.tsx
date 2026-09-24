import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import BookingFlow from '@/components/booking/BookingFlow'
import { getProviderDetail } from '@/lib/queries/providers'
import { pickCategoryName, pickProviderContent } from '@/lib/i18n/content'

type Params = { locale: string; category: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { locale, category, slug } = await params
  const provider = await getProviderDetail(category, slug)
  if (!provider) return {}
  const { name } = pickProviderContent(provider, provider.provider_translations, locale)
  return { title: name }
}

// Booking flow (DEMO_MAP §3.3): crumbs + the step-by-step flow; a provider
// without online booking gets an honest "not bookable here" state.
export default async function BookPage({ params }: { params: Promise<Params> }) {
  const { locale, category, slug } = await params
  setRequestLocale(locale)

  const provider = await getProviderDetail(category, slug)
  if (!provider) notFound()

  const t = await getTranslations()
  const { name } = pickProviderContent(provider, provider.provider_translations, locale)
  const categoryName = provider.categories ? pickCategoryName(provider.categories, locale) : category
  const bookable =
    provider.fulfillment_type === 'native_booking' && provider.booking_enabled && provider.services.length > 0

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label={t('listing.crumbsLabel')}>
        <Link href={`/${category}`}>{categoryName}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/${category}/${slug}`}>{name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t('booking.v2.heading')}</span>
      </nav>

      {bookable ? (
        // "Today" is resolved on the server (London date) so server and client
        // render the same days — no hydration mismatch.
        <Suspense>
          <BookingFlow
            providerId={provider.id}
            providerName={name}
            borough={provider.borough}
            address={provider.address}
            categorySlug={category}
            providerSlug={slug}
            services={provider.services.map((s) => ({
              id: s.id,
              name: locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en,
              durationMin: s.duration_min,
              pricePence: s.price_pence,
              capacity: s.capacity,
            }))}
            todayIso={new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())}
          />
        </Suspense>
      ) : (
        <div className="empty page">
          <h1 className="ph1">{t('booking.notBookableTitle')}</h1>
          <p>{t('booking.notBookableBody')}</p>
          <div className="acts">
            <Link href={`/${category}/${slug}`} className="btn btn-ink">
              {t('booking.v2.backToProvider')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

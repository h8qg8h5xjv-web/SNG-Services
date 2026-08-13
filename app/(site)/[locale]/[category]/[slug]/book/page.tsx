import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import { Link } from '@/i18n/navigation'
import BookingWidget from '@/components/booking/BookingWidget'
import { getProviderDetail } from '@/lib/queries/providers'
import { pickProviderContent } from '@/lib/i18n/content'

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

export default async function BookPage({ params }: { params: Promise<Params> }) {
  const { locale, category, slug } = await params
  setRequestLocale(locale)

  const provider = await getProviderDetail(category, slug)
  if (!provider) notFound()

  const t = await getTranslations()
  const { name } = pickProviderContent(provider, provider.provider_translations, locale)

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-2xl font-semibold">{t('booking.title', { name })}</h1>

        {provider.fulfillment_type === 'native_booking' && provider.services.length > 0 ? (
          <BookingWidget services={provider.services} />
        ) : (
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <h2 className="text-lg font-medium">{t('booking.notBookableTitle')}</h2>
            <p className="mt-2 text-sm text-foreground/60">{t('booking.notBookableBody')}</p>
            <Link
              href={`/${category}/${slug}`}
              className="mt-4 inline-block text-sm font-medium hover:underline"
            >
              ← {t('booking.backToProvider')}
            </Link>
          </div>
        )}
      </main>
    </>
  )
}

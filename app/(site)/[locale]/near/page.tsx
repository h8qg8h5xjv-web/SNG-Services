import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMapPin } from '@tabler/icons-react'
import Header from '@/components/Header'
import ProviderGrid from '@/components/ProviderGrid'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { toCard } from '@/lib/catalog/transform'

export const dynamic = 'force-dynamic'

// "Рядом" (§11): providers to browse locally. Distance-from-district sorting and
// the map arrive with the district feature; for now it lists published providers.
export default async function NearPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const providers = await listAllPublishedProviders()
  const cards = providers.map((p) => toCard(p, p.categories?.slug ?? '', locale))

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-page flex-1 px-3.5 py-6 sm:px-6">
        <h1 className="text-title font-extrabold tracking-tight">{t('nav.near')}</h1>
        {cards.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={IconMapPin}
              text={t('catalog.emptyCategory')}
              action={<ButtonLink href="/">{t('nav.catalog')}</ButtonLink>}
            />
          </div>
        ) : (
          <div className="mt-4">
            <ProviderGrid cards={cards} surface="near" />
            <TrackImpressions
              surface="near"
              locale={locale}
              items={cards.map((c, i) => ({ providerId: c.id, position: i + 1 }))}
            />
          </div>
        )}
      </main>
    </>
  )
}

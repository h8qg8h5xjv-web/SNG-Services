import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import ProviderGrid from '@/components/ProviderGrid'
import PlaceCard from '@/components/PlaceCard'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconSearch } from '@tabler/icons-react'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { matchesQuery, toCard, isServiceCard, isPlaceCard } from '@/lib/catalog/transform'
import { rankProviders } from '@/lib/ranking'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'search' })
  return { title: t('title') }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string | string[]; section?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').trim()
  const placesFirst = sp.section === 'places'
  const t = await getTranslations('search')

  const cards = q
    ? rankProviders(
        (await listAllPublishedProviders()).filter((p) => matchesQuery(p, q, locale)),
        { locale, sort: 'relevance' },
      ).map((p) => toCard(p, p.categories?.slug ?? '', locale))
    : []

  // One search over both, results grouped: the current section first (DESIGN §4).
  const serviceCards = cards.filter(isServiceCard)
  const placeCards = cards.filter(isPlaceCard)
  const servicesGroup = { key: 'services' as const, title: t('servicesGroup'), cards: serviceCards }
  const placesGroup = { key: 'places' as const, title: t('placesGroup'), cards: placeCards }
  const groups = (placesFirst ? [placesGroup, servicesGroup] : [servicesGroup, placesGroup]).filter(
    (g) => g.cards.length > 0,
  )

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <div className="py-6">
          <h1 className="mb-4 text-title font-semibold">{t('title')}</h1>
          <SearchBar initialQuery={q} />
        </div>

        {!q ? (
          <p className="text-slate-500">{t('prompt')}</p>
        ) : cards.length === 0 ? (
          <EmptyState icon={IconSearch} text={t('empty', { query: q })} />
        ) : (
          <>
            <p className="mb-4 text-body text-slate-500">{t('resultsFor', { query: q })}</p>
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.key}>
                  <h2 className="mb-3 text-h2 font-semibold">{group.title}</h2>
                  {group.key === 'places' ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {group.cards.map((card) => (
                        <PlaceCard key={card.id} card={card} />
                      ))}
                    </div>
                  ) : (
                    <ProviderGrid cards={group.cards} surface="search" />
                  )}
                </section>
              ))}
            </div>
            <TrackImpressions
              surface="search"
              locale={locale}
              items={cards.map((c, i) => ({ providerId: c.id, position: i + 1 }))}
            />
          </>
        )}
      </main>
    </>
  )
}

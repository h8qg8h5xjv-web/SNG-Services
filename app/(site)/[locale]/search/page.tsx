import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import NightHeader from '@/components/site/NightHeader'
import SearchBar from '@/components/SearchBar'
import ProviderGrid from '@/components/ProviderGrid'
import TrackImpressions from '@/components/TrackImpressions'
import { EmptyState } from '@/components/ui/EmptyState'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { getHomeCategories } from '@/lib/queries/categories'
import { getResponseMedians } from '@/lib/queries/response-time'
import { getFreeWindowsToday } from '@/lib/slots/service'
import { groupBySlug } from '@/lib/slots/windows'
import { matchesQuery, toCard, isServiceCard, isPlaceCard } from '@/lib/catalog/transform'
import { pickCategoryName } from '@/lib/i18n/content'
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

// Search (DEMO_MAP §3.6): a night header with the search box and a summary,
// then groups — matching categories, services, places. The matching itself is
// unchanged (matchesQuery + rankProviders).
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
  const t2 = await getTranslations('cat2')

  const [categories, windows] = await Promise.all([getHomeCategories(), q ? getFreeWindowsToday(locale) : Promise.resolve([])])
  const cards = q
    ? rankProviders(
        (await listAllPublishedProviders()).filter((p) => matchesQuery(p, q, locale)),
        { locale, sort: 'relevance' },
      ).map((p) => toCard(p, p.categories?.slug ?? '', locale))
    : []

  // One search over both, results grouped: the current section first.
  const serviceCards = cards.filter(isServiceCard)
  const placeCards = cards.filter(isPlaceCard)
  const needle = q.toLowerCase().replace(/ё/g, 'е')
  const matchedCategories = q
    ? categories.filter(({ category }) =>
        [category.name_ru, category.name_en].some((n) => n.toLowerCase().replace(/ё/g, 'е').includes(needle)),
      )
    : []

  // "Отвечает за N мин" on the service rows: median from request_targets.
  const medians = await getResponseMedians(serviceCards.map((c) => c.id))
  const responseMins: Record<string, number> = {}
  for (const [id, m] of medians) responseMins[id] = m
  const windowsBySlug = groupBySlug(windows)
  const servicesGroup = { key: 'services' as const, title: t('servicesGroup'), cards: serviceCards }
  const placesGroup = { key: 'places' as const, title: t('placesGroup'), cards: placeCards }
  const groups = (placesFirst ? [placesGroup, servicesGroup] : [servicesGroup, placesGroup]).filter(
    (g) => g.cards.length > 0,
  )

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('title')}</h1>
        <SearchBar initialQuery={q} />
        <p className="s-sum" aria-live="polite">
          {q ? (cards.length ? t2('searchSummary', { places: cards.length }) : '') : t('prompt')}
        </p>
      </NightHeader>

      <div className="wrap page">
        {q && cards.length === 0 && matchedCategories.length === 0 ? (
          <EmptyState
            className="mt-10"
            mark="?"
            title={t('empty', { query: q })}
            text={t2('emptyTitle')}
            action={
              <Link href={`/request/find?q=${encodeURIComponent(q)}`} className="btn btn-amber">
                {t2('postRequest')}
              </Link>
            }
          />
        ) : (
          <>
            {(!q || matchedCategories.length > 0) && (
              <section className="sgroup" aria-labelledby="sg-cats">
                <h2 id="sg-cats">{t2('searchCategories')}</h2>
                <div className="dchips">
                  {(q ? matchedCategories : categories).map(({ category }) => (
                    <Link key={category.slug} href={`/${category.slug}`} className="dchip">
                      {pickCategoryName(category, locale)}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {groups.map((group) => (
              <section key={group.key} className="sgroup" aria-labelledby={`sg-${group.key}`}>
                <h2 id={`sg-${group.key}`}>{group.title}</h2>
                <ProviderGrid
                  cards={group.cards}
                  surface="search"
                  responseMins={group.key === 'services' ? responseMins : undefined}
                  windowsBySlug={windowsBySlug}
                />
              </section>
            ))}
            {cards.length > 0 && (
              <TrackImpressions
                surface="search"
                locale={locale}
                items={cards.map((c, i) => ({ providerId: c.id, position: i + 1 }))}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

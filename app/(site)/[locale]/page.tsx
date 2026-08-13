import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import RecentlyViewed from '@/components/RecentlyViewed'
import CategoryGrid from '@/components/CategoryGrid'
import AvailableToday from '@/components/AvailableToday'
import { getHomeCategories } from '@/lib/queries/categories'
import { getAvailableTodayProviders } from '@/lib/slots/service'
import { pickCategoryName } from '@/lib/i18n/content'

// Live "available today" data is request-time; never statically prerendered.
export const dynamic = 'force-dynamic'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [categories, availableToday] = await Promise.all([
    getHomeCategories(),
    getAvailableTodayProviders(),
  ])
  const tiles = categories.map(({ category, count }) => ({
    slug: category.slug,
    name: pickCategoryName(category, locale),
    icon: category.icon,
    count,
  }))

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <section className="py-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t('home.heroTitle')}</h1>
          <p className="mt-3 max-w-2xl text-foreground/70">{t('home.heroSubtitle')}</p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </section>

        <RecentlyViewed />

        <AvailableToday providers={availableToday} locale={locale} />

        <section className="py-6">
          <h2 className="mb-3 text-lg font-medium">{t('home.categoriesTitle')}</h2>
          {tiles.length > 0 ? (
            <CategoryGrid items={tiles} />
          ) : (
            <p className="text-sm text-foreground/50">{t('empty.noResults')}</p>
          )}
        </section>
      </main>
    </>
  )
}

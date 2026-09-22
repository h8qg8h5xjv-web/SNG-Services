import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconBriefcase } from '@tabler/icons-react'
import { SectionHeading } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/Button'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import HomeHowItWorks from '@/components/HomeHowItWorks'
import RecentlyViewed from '@/components/RecentlyViewed'
import CategoryGrid from '@/components/CategoryGrid'
import AvailableToday from '@/components/AvailableToday'
import ServiceNeedBar from '@/components/requests/ServiceNeedBar'
import { getHomeCategories } from '@/lib/queries/categories'
import { getAvailableTodayProviders } from '@/lib/slots/service'
import { pickCategoryName } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'

// Home = search (§1). Order (§3): search → categories → available today →
// recently viewed → how it works → masters. No Услуги/Места tabs — places live in
// the categories and in "Рядом".
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
      {/* Dark block: title, trust line, search (§3). No gradient, no tabs. */}
      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-page px-3.5 py-7 sm:px-6">
          <h1 className="text-title font-extrabold tracking-tight">{t('home.heroTitle')}</h1>
          <p className="mt-2 text-meta text-blue-200">{t('home.heroSubtitle')}</p>
          <div className="mt-4">
            <SearchBar />
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-page flex-1 px-3.5 pb-8 sm:px-6">
        <div className="py-5">
          <ServiceNeedBar />
        </div>

        <section className="py-2">
          <SectionHeading>{t('home.categoriesTitle')}</SectionHeading>
          {tiles.length > 0 ? (
            <CategoryGrid items={tiles} />
          ) : (
            <p className="text-body text-slate-500">{t('empty.noResults')}</p>
          )}
        </section>

        <AvailableToday providers={availableToday} locale={locale} />

        <RecentlyViewed />

        <HomeHowItWorks />

        {/* Masters block (§3): dark card with a white button. */}
        <section className="my-8 flex flex-col gap-3 rounded-card bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-badge bg-white text-accent">
              <IconBriefcase className="h-6 w-6" stroke={1.5} />
            </span>
            <p className="text-body font-semibold">{t('home.masters.title')}</p>
          </div>
          <ButtonLink href="/cabinet/cards" variant="secondary" className="w-full sm:w-auto">
            {t('cabinet.cards.create')}
          </ButtonLink>
        </section>
      </main>
    </>
  )
}

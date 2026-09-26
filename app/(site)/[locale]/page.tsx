import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import DistrictBar from '@/components/DistrictBar'
import RecentlyViewed from '@/components/RecentlyViewed'
import HomeLive from '@/components/home/HomeLive'
import HowItWorks from '@/components/home/HowItWorks'
import Facade from '@/components/home/Facade'
import { getHomeCategories } from '@/lib/queries/categories'
import { getDistinctBoroughs } from '@/lib/queries/providers'
import { getFreeWindows } from '@/lib/slots/service'
import { countByCategory, countsBySlugDay, homePool, londonDate } from '@/lib/slots/windows'
import { pickCategoryName } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'

// The six hero chips, as in the design; any missing category is replaced by the
// next one with the most providers.
const CHIP_ORDER = ['beauty', 'health', 'kids', 'education', 'home', 'legal']

// Home (DEMO_MAP §3.1): night hero with the city → «Ближайшие окна» → three
// steps → categories with this week's free windows → recently viewed →
// business. Every number here comes from getFreeWindows (real availability,
// next 7 days, Europe/London).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home.v2')
  const [categories, windows, boroughs] = await Promise.all([
    getHomeCategories(),
    getFreeWindows({ locale }),
    getDistinctBoroughs(),
  ])

  const today = londonDate(new Date())
  const counts = countByCategory(windows)
  // The client gets a small pool (what the city lights + each provider's first
  // window per day) and exact per-day counts, not the whole week.
  const pool = homePool(windows)
  const exact = countsBySlugDay(windows, today)
  const present = new Set(categories.map((c) => c.category.slug))
  const chipSlugs = [
    ...CHIP_ORDER.filter((s) => present.has(s)),
    ...categories.map((c) => c.category.slug).filter((s) => !CHIP_ORDER.includes(s)),
  ].slice(0, 6)
  const bySlug = new Map(categories.map((c) => [c.category.slug, c.category]))
  const chips = chipSlugs.map((slug) => ({ slug, name: pickCategoryName(bySlug.get(slug)!, locale) }))
  const categoryNames = Object.fromEntries(
    categories.map(({ category }) => [category.slug, [category.name_ru, category.name_en]]),
  )
  const categoryLabel = Object.fromEntries(
    categories.map(({ category }) => [category.slug, pickCategoryName(category, locale)]),
  )

  return (
    <>
      <HomeLive windows={pool} counts={exact} today={today} chips={chips} categoryNames={categoryNames} categoryLabel={categoryLabel} />

      <HowItWorks />

      <section className="cats" aria-labelledby="cats-h">
        <div className="wrap">
          <h2 id="cats-h">{t('catsTitle')}</h2>
          <p className="sec-sub">{t('catsSub')}</p>
          <div className="cat-list">
            {categories.map(({ category }) => {
              const n = counts[category.slug] ?? 0
              const name = pickCategoryName(category, locale)
              return (
                <Link key={category.slug} className="cat" href={`/${category.slug}`}>
                  {name}
                  <sup aria-label={n ? undefined : t('catsNone')}>{n || '—'}</sup>
                </Link>
              )
            })}
          </div>
          {boroughs.length > 0 && <DistrictBar boroughs={boroughs} />}
        </div>
      </section>

      <RecentlyViewed />

      <section className="night biz" aria-labelledby="biz-h">
        <div className="wrap biz-grid">
          <div>
            <h2 id="biz-h">
              {t('bizTitle1')}
              <br />
              {t('bizTitle2')}
            </h2>
            <ul className="biz-points">
              <li>{t('biz1')}</li>
              <li>{t('biz2')}</li>
              <li>{t('biz3')}</li>
            </ul>
            <div className="biz-cta">
              <Link className="btn btn-amber" href="/for-business">
                {t('bizApply')}
              </Link>
              <Link className="btn btn-ghost" href="/cabinet">
                {t('bizSignIn')}
              </Link>
            </div>
          </div>
          <div>
            <Facade />
            <p className="facade-cap">{t('bizCaption')}</p>
          </div>
        </div>
      </section>
    </>
  )
}

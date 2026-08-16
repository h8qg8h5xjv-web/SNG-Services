import { cookies } from 'next/headers'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconMoodSad } from '@tabler/icons-react'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import ProviderGrid from '@/components/ProviderGrid'
import { ButtonLink } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import { listProvidersByCategory } from '@/lib/queries/providers'
import { getCategoryBySlug } from '@/lib/queries/categories'
import { createClient } from '@/lib/supabase/server'
import { toCard, isServiceEligible } from '@/lib/catalog/transform'
import { matchCategory } from '@/lib/requests/match-category'
import { recordSearchEmpty } from '@/lib/tracking/events'
import { pickCategoryName } from '@/lib/i18n/content'

export const dynamic = 'force-dynamic'

export default async function RequestFindPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const q = (await searchParams).q?.trim() ?? ''
  const t = await getTranslations('request')
  const supabase = await createClient()

  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_ru, sort_order')
    .order('sort_order', { ascending: true })
  const categories = cats ?? []
  const matchedSlug = q ? matchCategory(q, categories) : null
  const category = matchedSlug ? await getCategoryBySlug(matchedSlug) : null

  // Not recognised → log it and offer manual category choice (REQUESTS 12.2).
  if (!category) {
    if (q) {
      const sessionId = (await cookies()).get('sng_sid')?.value ?? null
      await recordSearchEmpty(q, sessionId, locale)
    }
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pt-4">
          <BackButton />
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-200 p-8 text-center">
            <IconMoodSad className="h-6 w-6 text-slate-400" stroke={1.5} />
            <p className="text-body text-slate-500">{t('notRecognised', { query: q })}</p>
          </div>
          <h2 className="mb-3 mt-6 text-h2 font-semibold">{t('chooseCategory')}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/request?category=${c.slug}`}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-center text-body font-semibold transition-colors hover:border-teal-700"
                >
                  {pickCategoryName(c, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </>
    )
  }

  const providers = (await listProvidersByCategory(category.id)).filter(isServiceEligible)
  const cards = providers.map((p) => toCard(p, category.slug, locale))

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-semibold">
          {t('foundFor', { category: pickCategoryName(category, locale) })}
        </h1>

        {/* Request is the main path — offered prominently above the masters. */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
          <p className="text-body text-slate-500">{t('leaveRequest')}</p>
          <ButtonLink href={`/request?category=${category.slug}`}>{t('submit')}</ButtonLink>
        </div>

        {cards.length > 0 ? (
          <ProviderGrid cards={cards} surface="search" />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
            {t('noMastersYet')}
          </p>
        )}
      </main>
    </>
  )
}

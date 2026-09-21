import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import SavedList from '@/components/SavedList'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { toCard } from '@/lib/catalog/transform'

export const dynamic = 'force-dynamic'

// Saved list. Which providers are saved is client-only (localStorage), so we pass
// the full published set and SavedList filters it to the saved slugs.
export default async function SavedPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('saved')
  const providers = await listAllPublishedProviders()
  const cards = providers.map((p) => toCard(p, p.categories?.slug ?? '', locale))

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-extrabold tracking-tight">{t('title')}</h1>
        <div className="mt-4">
          <SavedList cards={cards} />
        </div>
      </main>
    </>
  )
}

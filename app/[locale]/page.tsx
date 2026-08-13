import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <section className="py-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-3 max-w-2xl text-foreground/70">{t('heroSubtitle')}</p>

          {/* Search wiring lands in step 4 (catalog); this is the translated shell. */}
          <div className="mt-6">
            <input
              type="search"
              disabled
              placeholder={t('searchPlaceholder')}
              className="min-h-11 w-full max-w-xl rounded-lg border border-black/10 bg-transparent px-4 py-2 dark:border-white/20"
            />
          </div>
        </section>

        {/* Live data for these blocks is connected in later steps (see PROMPTS.md). */}
        <section className="py-6">
          <h2 className="text-lg font-medium">{t('availableToday')}</h2>
          <p className="mt-2 text-sm text-foreground/50">{t('categoriesTitle')}</p>
        </section>
      </main>
    </>
  )
}

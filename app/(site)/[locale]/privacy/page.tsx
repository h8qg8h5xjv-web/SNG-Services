import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('title'), robots: { index: false, follow: true } }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('privacy')

  const sections: [string, string][] = [
    [t('collectTitle'), t('collectBody')],
    [t('retentionTitle'), t('retentionBody')],
    [t('shareTitle'), t('shareBody')],
    [t('rightsTitle'), t('rightsBody')],
    [t('deleteTitle'), t('deleteBody')],
  ]

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-extrabold tracking-tight">{t('title')}</h1>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-meta text-amber-900">
          {t('draftNote')}
        </p>
        <p className="mt-4 text-body text-slate-500">{t('operator')}</p>
        <div className="mt-6 space-y-6">
          {sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-h2 font-semibold">{title}</h2>
              <p className="mt-1 text-body text-slate-600">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}

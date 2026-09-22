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
  const t = await getTranslations({ locale, namespace: 'terms' })
  return { title: t('title'), robots: { index: false, follow: true } }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('terms')

  const sections: [string, string][] = [
    [t('platformTitle'), t('platformBody')],
    [t('responsibilityTitle'), t('responsibilityBody')],
    [t('cancellationsTitle'), t('cancellationsBody')],
    [t('complaintsTitle'), t('complaintsBody')],
  ]

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-extrabold tracking-tight">{t('title')}</h1>
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

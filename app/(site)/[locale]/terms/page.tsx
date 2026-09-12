import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'

export const dynamic = 'force-dynamic'

// Placeholder until the real Terms & Privacy are written before launch (LEGAL A3).
// The footer links here; keeping it honest rather than shipping fake legal text.
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('footer')
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-semibold">{t('terms')}</h1>
        <p className="mt-3 text-body text-slate-500">{t('termsPlaceholder')}</p>
      </main>
    </>
  )
}

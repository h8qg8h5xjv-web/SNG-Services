import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'

// Placeholder — accounts are offered only after a first booking (later phase).
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-title font-semibold">{t('nav.profile')}</h1>
        <p className="mt-3 text-slate-500">{t('misc.comingSoon')}</p>
      </main>
    </>
  )
}

import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'

// Placeholder — the bookings list arrives with the booking flow (step 7).
export default async function BookingsPage({
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
        <h1 className="text-2xl font-semibold">{t('nav.bookings')}</h1>
        <p className="mt-3 text-foreground/60">{t('misc.comingSoon')}</p>
      </main>
    </>
  )
}

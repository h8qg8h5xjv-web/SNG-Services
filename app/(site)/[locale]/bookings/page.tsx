import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import MyRequests from '@/components/requests/MyRequests'

// "Bookings": a guest's own requests (by tokens saved locally), with live status.
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-title font-semibold">{t('nav.bookings')}</h1>
        <MyRequests />
      </main>
    </>
  )
}

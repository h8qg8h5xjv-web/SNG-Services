import { getTranslations, setRequestLocale } from 'next-intl/server'
import NightHeader from '@/components/site/NightHeader'
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
      <NightHeader>
        <h1 className="ph1">{t('nav.bookings')}</h1>
      </NightHeader>
      <div className="wrap page pt-8">
        <MyRequests />
      </div>
    </>
  )
}

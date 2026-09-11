import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import RequestStatus from '@/components/requests/RequestStatus'
import { getGuestRequestState } from '@/lib/requests/guest'

export const dynamic = 'force-dynamic'

export default async function RequestWaitingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; ref: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { locale, ref } = await params
  setRequestLocale(locale)
  const { token } = await searchParams
  if (!token) notFound()

  const initial = await getGuestRequestState(ref, token)
  if (!initial) notFound()

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <RequestStatus ref_={ref} token={token} initial={initial} locale={locale} />
      </main>
    </>
  )
}

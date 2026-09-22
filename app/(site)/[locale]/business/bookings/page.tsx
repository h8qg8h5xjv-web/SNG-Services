import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconCalendarEvent } from '@tabler/icons-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getCabinetBookings } from '@/lib/business/data'
import { dateTimeFormat } from '@/lib/intl'

export const dynamic = 'force-dynamic'

const TONE: Record<string, 'success' | 'neutral' | 'error'> = {
  confirmed: 'success',
  pending: 'neutral',
  cancelled: 'error',
}

export default async function BusinessBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('business.bookings')
  const tt = await getTranslations('business.tabs')
  const bookings = await getCabinetBookings()

  const dtf = dateTimeFormat(locale, {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      <h1 className="mb-4 text-title font-extrabold tracking-tight">{tt('bookings')}</h1>
      {bookings.length === 0 ? (
        <EmptyState icon={IconCalendarEvent} text={t('empty')} />
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body font-semibold">{dtf.format(new Date(b.startsAt))}</span>
                <StatusBadge tone={TONE[b.status] ?? 'neutral'}>{t(`status.${b.status}`)}</StatusBadge>
              </div>
              {b.serviceName && <p className="text-meta text-slate-500">{b.serviceName}</p>}
              {/* Contacts — only ever this master's own bookings reach here. */}
              <p className="mt-1 text-body">{b.customerName}</p>
              <p className="text-meta text-slate-500">
                {[b.customerPhone, b.customerEmail].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

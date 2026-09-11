'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconCalendarCheck } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSavedRequests } from '@/lib/requests/local-store'
import { getGuestRequestState, type GuestRequestState } from '@/lib/requests/guest'

type Row = { ref: string; token: string; state: GuestRequestState | null }

const TONE: Record<GuestRequestState['status'], 'success' | 'neutral' | 'error'> = {
  draft: 'neutral',
  broadcasting: 'neutral',
  matched: 'success',
  confirmed: 'success',
  completed: 'success',
  expired: 'error',
  cancelled: 'error',
}

export default function MyRequests() {
  const t = useTranslations('request')
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    const load = async () => {
      const saved = getSavedRequests()
      const resolved = await Promise.all(
        saved.map(async (s) => ({
          ref: s.ref,
          token: s.token,
          state: await getGuestRequestState(s.ref, s.token),
        })),
      )
      setRows(resolved.filter((r) => r.state !== null))
    }
    load()
  }, [])

  if (rows === null) return <p className="text-body text-slate-500">…</p>
  if (rows.length === 0) {
    return <EmptyState icon={IconCalendarCheck} text={t('myRequestsEmpty')} />
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ ref, token, state }) => {
        const s = state!
        const active = s.status === 'broadcasting' || s.status === 'matched'
        const inner = (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-body font-semibold">
                {s.match ? s.match.providerName : t('requestRef', { ref })}
              </p>
              <p className="text-meta text-slate-500">{t(`status.${s.status}`)}</p>
            </div>
            <StatusBadge tone={TONE[s.status]}>{t(`status.${s.status}`)}</StatusBadge>
          </div>
        )
        return active ? (
          <Link key={ref} href={`/requests/${ref}?token=${token}`} className="block">
            {inner}
          </Link>
        ) : (
          <div key={ref}>{inner}</div>
        )
      })}
    </div>
  )
}

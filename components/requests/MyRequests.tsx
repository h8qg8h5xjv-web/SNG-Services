'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconPlus } from '@tabler/icons-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
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
  manual: 'neutral',
  handled: 'success',
}

export default function MyRequests() {
  const t = useTranslations('request')
  const tc = useTranslations('cabinet2')
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

  if (rows === null) {
    return (
      <ul className="bl" aria-hidden="true">
        {[0, 1].map((i) => (
          <li key={i} className="card crow">
            <div className="w-1/2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        mark="?"
        title={tc('emptyRequests')}
        text={tc('emptyRequestsText')}
        action={
          <ButtonLink href="/request/find" variant="amber">
            {tc('describeTask')}
          </ButtonLink>
        }
      />
    )
  }

  return (
    <div className="grid gap-4">
      <ul className="bl">
        {rows.map(({ ref, token, state }) => {
          const s = state!
          const active = s.status === 'broadcasting' || s.status === 'matched'
          return (
            <li key={ref} className={`card crow ${active ? '' : 'opacity-80'}`}>
              <div>
                <b>{s.match ? s.match.providerName : t('requestRef', { ref })}</b>
                <StatusBadge tone={TONE[s.status]}>{t(`status.${s.status}`)}</StatusBadge>
              </div>
              {active && (
                <ButtonLink href={`/requests/${ref}?token=${token}`} variant="line" size="sm">
                  {tc('open')}
                </ButtonLink>
              )}
            </li>
          )
        })}
      </ul>
      <div>
        <ButtonLink href="/request/find" variant="plain" className="px-0">
          <IconPlus stroke={1.75} aria-hidden="true" />
          {tc('newRequest')}
        </ButtonLink>
      </div>
    </div>
  )
}

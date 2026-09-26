'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Attendance from '@/components/events/Attendance'
import { goingToEvent, leaveEvent, type EventAttendance } from '@/lib/events/attendance'

const KEY = 'sng_going'

function readGoing(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
function writeGoing(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200)))
  } catch {
    // ignore
  }
}

// §4 guest "I'm going". Dedup is per browser (localStorage here + session cookie
// server-side). Shows the live count + initials; a name is optional (shown as
// initials to the group).
export default function GoingButton({
  eventId,
  initial,
}: {
  eventId: string
  initial: EventAttendance
}) {
  const t = useTranslations('events')
  const router = useRouter()
  const [going, setGoing] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Deferred so it doesn't set state synchronously during the effect (and
    // matches SSR, where localStorage is unavailable and the button starts idle).
    const id = requestAnimationFrame(() => setGoing(readGoing().includes(eventId)))
    return () => cancelAnimationFrame(id)
  }, [eventId])

  async function join() {
    setBusy(true)
    const res = await goingToEvent(eventId, name, true)
    setBusy(false)
    if (res.ok) {
      writeGoing([eventId, ...readGoing().filter((id) => id !== eventId)])
      setGoing(true)
      router.refresh()
    }
  }
  async function leave() {
    setBusy(true)
    const res = await leaveEvent(eventId)
    setBusy(false)
    if (res.ok) {
      writeGoing(readGoing().filter((id) => id !== eventId))
      setGoing(false)
      router.refresh()
    }
  }

  return (
    <div className="going">
      <Attendance data={initial} />
      {going ? (
        <div className="going-row items-center">
          <span className="status taken">
            <i aria-hidden="true" />
            {t('youAreGoing')}
          </span>
          <Button variant="line" size="sm" onClick={leave} disabled={busy}>
            {t('notGoing')}
          </Button>
        </div>
      ) : (
        <div className="going-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('goingNamePlaceholder')}
            aria-label={t('goingNamePlaceholder')}
            autoComplete="given-name"
          />
          <Button variant="ink" onClick={join} disabled={busy}>
            {t('imGoing')}
          </Button>
        </div>
      )}
    </div>
  )
}

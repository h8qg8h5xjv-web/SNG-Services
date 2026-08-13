'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBookingStatus } from '@/lib/admin/booking-actions'

const STATUSES = ['pending', 'confirmed', 'cancelled'] as const

export default function BookingStatus({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function onChange(next: string) {
    setError('')
    startTransition(async () => {
      const result = await updateBookingStatus(id, next)
      if (result.ok) router.refresh()
      else setError(result.formError ?? 'Failed')
    })
  }

  return (
    <div>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-9 rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

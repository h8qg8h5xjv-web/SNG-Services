'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBookingStatus } from '@/lib/admin/booking-actions'
import Select from '@/components/ui/Select'

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
      <Select
        value={status}
        onChange={onChange}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
        ariaLabel="Status"
        disabled={pending}
        className="w-40"
      />
      {error && <p className="mt-1 text-meta text-red-700">{error}</p>}
    </div>
  )
}

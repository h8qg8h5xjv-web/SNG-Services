'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCatalogRequestStatus } from '@/lib/admin/catalog-actions'
import type { CatalogRequestStatus } from '@/types/database'

const STATUSES: CatalogRequestStatus[] = ['new', 'handled', 'dismissed']

export default function CatalogRequestStatusSelect({
  id,
  status,
}: {
  id: string
  status: CatalogRequestStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function onChange(next: CatalogRequestStatus) {
    setError('')
    startTransition(async () => {
      const result = await setCatalogRequestStatus(id, next)
      if (result.ok) router.refresh()
      else setError(result.error)
    })
  }

  return (
    <div>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as CatalogRequestStatus)}
        className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-body"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-meta text-red-700">{error}</p>}
    </div>
  )
}

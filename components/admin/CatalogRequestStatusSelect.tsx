'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCatalogRequestStatus } from '@/lib/admin/catalog-actions'
import Select from '@/components/ui/Select'
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
      <Select
        value={status}
        onChange={(v) => onChange(v as CatalogRequestStatus)}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
        ariaLabel="Status"
        disabled={pending}
        className="w-40"
      />
      {error && <p className="mt-1 text-meta text-red-700">{error}</p>}
    </div>
  )
}

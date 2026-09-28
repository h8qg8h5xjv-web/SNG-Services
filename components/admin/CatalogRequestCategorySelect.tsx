'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCatalogRequestCategory } from '@/lib/admin/catalog-actions'
import Select from '@/components/ui/Select'

// Admin: map a catalogue request to an existing category (e.g. after reading a
// «Моей категории нет» suggestion). Creating a new category is a separate step.
export default function CatalogRequestCategorySelect({
  id,
  categoryId,
  categories,
}: {
  id: string
  categoryId: string | null
  categories: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function onChange(next: string) {
    setError('')
    startTransition(async () => {
      const result = await setCatalogRequestCategory(id, next || null)
      if (result.ok) router.refresh()
      else setError(result.error)
    })
  }

  return (
    <div>
      <Select
        value={categoryId ?? ''}
        onChange={onChange}
        options={[{ value: '', label: '— not mapped —' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        ariaLabel="Category"
        disabled={pending}
        className="w-48"
      />
      {error && <p className="mt-1 text-meta text-red-700">{error}</p>}
    </div>
  )
}

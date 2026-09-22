'use client'

import { useState, useTransition } from 'react'
import { publishDraft } from '@/lib/admin/review-actions'

// Admin UI — English, palette only.
export default function PublishDraft({ providerId }: { providerId: string }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function publish() {
    setError('')
    startTransition(async () => {
      const res = await publishDraft(providerId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={publish}
        disabled={pending}
        className="min-h-9 rounded-lg bg-slate-900 px-3 text-meta text-white disabled:opacity-60"
      >
        {pending ? '…' : 'Confirm language & publish'}
      </button>
      {error && <p className="text-meta text-red-700">{error}</p>}
    </div>
  )
}

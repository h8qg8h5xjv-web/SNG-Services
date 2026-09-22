'use client'

import { useState, useTransition } from 'react'
import { markNotificationSent } from '@/lib/admin/notification-actions'

// §5 one queued notification: copy the body, then mark it sent after forwarding
// by hand (WhatsApp). Admin UI — English, palette only.
export default function NotificationRow({
  id,
  phone,
  body,
}: {
  id: string
  phone: string | null
  body: string
}) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Copy failed — select the text manually.')
    }
  }

  function markSent() {
    setError('')
    startTransition(async () => {
      const res = await markNotificationSent(id)
      if (!res.ok) setError(res.error)
    })
  }

  const wa = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="min-h-9 rounded-lg border border-slate-300 px-3 text-meta hover:bg-slate-50"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-meta hover:bg-slate-50"
        >
          Open WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={markSent}
        disabled={pending}
        className="min-h-9 rounded-lg bg-slate-900 px-3 text-meta text-white disabled:opacity-60"
      >
        {pending ? '…' : 'Sent'}
      </button>
      {error && <p className="text-meta text-red-700">{error}</p>}
    </div>
  )
}

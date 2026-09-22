'use client'

import { useState, useTransition } from 'react'
import { markRequestHandled } from '@/lib/admin/request-actions'

// §1 admin controls for one request: copy a ready-to-send message to a master,
// and (for manual requests) record the hand-off. Admin UI — English, palette only.
export default function RequestHandoff({
  id,
  message,
  status,
  handledTo,
}: {
  id: string
  message: string
  status: string
  handledTo: string | null
}) {
  const [copied, setCopied] = useState(false)
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Copy failed — select the text manually.')
    }
  }

  function handoff() {
    setError('')
    startTransition(async () => {
      const res = await markRequestHandled(id, to)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={copy}
        className="min-h-9 rounded-lg border border-slate-300 px-3 text-meta hover:bg-slate-50"
      >
        {copied ? 'Copied ✓' : 'Copy message to master'}
      </button>

      {status === 'manual' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Passed to (name)"
            className="min-h-9 rounded-lg border border-slate-300 px-2 text-meta"
          />
          <button
            type="button"
            onClick={handoff}
            disabled={pending}
            className="min-h-9 rounded-lg bg-slate-900 px-3 text-meta text-white disabled:opacity-60"
          >
            {pending ? '…' : 'Mark handed off'}
          </button>
        </div>
      ) : status === 'handled' ? (
        <p className="text-meta text-slate-500">Handed off{handledTo ? ` → ${handledTo}` : ''}</p>
      ) : null}

      {error && <p className="text-meta text-red-700">{error}</p>}
    </div>
  )
}

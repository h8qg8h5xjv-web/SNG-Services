'use client'

import { useState } from 'react'
import { createProviderInvite } from '@/lib/admin/invite-actions'

export default function InviteOwner({ providerId }: { providerId: string }) {
  const [pending, setPending] = useState(false)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  async function onClick() {
    setPending(true)
    setError('')
    const result = await createProviderInvite(providerId)
    setPending(false)
    if (result.ok) {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL ?? ''
      setLink(`${base}/business/claim?token=${result.token}`)
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-2 text-body font-semibold">Invite the business owner</h3>
      <p className="mb-3 text-body text-slate-500">
        Generates a one-time link (valid 7 days). Send it to the business — they
        sign in and claim this card.
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="min-h-11 rounded-lg border border-slate-200 px-4 text-body"
      >
        {pending ? 'Generating…' : 'Generate invite link'}
      </button>
      {link && (
        <p className="mt-3 break-all rounded-lg bg-slate-100 p-3 text-meta">{link}</p>
      )}
      {error && <p className="mt-2 text-body text-red-700">{error}</p>}
    </section>
  )
}

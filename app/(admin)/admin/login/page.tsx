'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('sending')
    setMessage('')
    const supabase = createClient()
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') ?? '/admin'
    const redirectTo = `${window.location.origin}/admin/auth/confirm?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-title font-semibold">SNG Services — Admin</h1>
      <p className="mt-2 text-body text-slate-500">
        Sign in with a magic link sent to your email.
      </p>

      {status === 'sent' ? (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-100 p-4 text-body">
          Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-4"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="min-h-11 w-full rounded-lg bg-teal-700 px-4 font-semibold text-white disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && (
            <p className="text-body text-red-700">{message}</p>
          )}
        </form>
      )}
    </main>
  )
}

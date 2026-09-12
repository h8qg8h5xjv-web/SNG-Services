'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Masters sign in with a magic link (same mechanism as admin). The account must
// already exist (shouldCreateUser:false) — created via invite or the
// seed:test-master script for local checks.
export default function BusinessLoginPage() {
  const t = useTranslations('business')
  const params = useParams()
  const search = useSearchParams()
  const locale = String(params.locale ?? 'en')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const notMember = search.get('error') === 'not_member'

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('sending')
    setMessage('')
    const supabase = createClient()
    const next = search.get('next') ?? `/${locale}/business/requests`
    const redirectTo = `${window.location.origin}/${locale}/business/auth/confirm?next=${encodeURIComponent(next)}`
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
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-8">
      <h1 className="text-title font-semibold">{t('loginTitle')}</h1>
      <p className="mt-2 text-body text-slate-500">{t('loginIntro')}</p>
      {notMember && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-100 p-3 text-body">{t('notMember')}</p>
      )}

      {status === 'sent' ? (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-100 p-4 text-body">
          {t('loginSent', { email })}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full"
          />
          <Button type="submit" disabled={status === 'sending'} className="w-full">
            {status === 'sending' ? t('loginSending') : t('loginSend')}
          </Button>
          {status === 'error' && <p className="text-body text-red-700">{message}</p>}
        </form>
      )}

      <p className="mt-6 text-body text-slate-500">
        {t('noAccess')}{' '}
        <Link href="/for-business" className="font-semibold text-teal-700 hover:underline">
          {t('noAccessLink')}
        </Link>
      </p>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Soft sign-in prompt shown at the top of the cabinet when signed out. Magic link;
// on return, browser data auto-links to the account (see AutoLink).
export default function LoginBlock() {
  const t = useTranslations('cabinet')
  const tc = useTranslations('cabinet2')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setMessage('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/${locale}/cabinet/auth/confirm`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <section className="card cab-login" aria-labelledby="login-h">
      <p>
        <b id="login-h">{t('loginTitle')}</b> <span className="muted">— {t('loginBody')}</span>
      </p>
      {status === 'sent' ? (
        <p className="msg-ok" role="status">
          {t('loginSent', { email })}
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label={tc('emailLabel')}
            autoComplete="email"
          />
          <Button type="submit" variant="ink" disabled={status === 'sending'}>
            {status === 'sending' ? t('loginSending') : tc('loginCta')}
          </Button>
        </form>
      )}
      {status === 'error' && (
        <p className="msg-err-inline" role="alert">
          {message}
        </p>
      )}
    </section>
  )
}

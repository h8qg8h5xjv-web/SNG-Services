'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconDevices, IconHeart, IconId } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Sign-in prompt at the top of the cabinet when signed out. Signing in IS
// creating the cabinet (magic link, shouldCreateUser), so the copy says so and
// lists what you get. On return, browser data auto-links (see AutoLink).
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
      <div>
        <h2 id="login-h" className="h3">
          {t('loginTitle')}
        </h2>
        <p className="muted">{t('loginBody')}</p>
      </div>
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
      <ul className="cab-perks" aria-label={tc('perksLabel')}>
        <li>
          <IconDevices stroke={1.75} aria-hidden="true" />
          {tc('perkDevices')}
        </li>
        <li>
          <IconHeart stroke={1.75} aria-hidden="true" />
          {tc('perkSaved')}
        </li>
        <li>
          <IconId stroke={1.75} aria-hidden="true" />
          {tc('perkMaster')}
        </li>
      </ul>
    </section>
  )
}

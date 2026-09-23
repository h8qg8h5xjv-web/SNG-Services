'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconMail, IconArrowRight } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

// Soft sign-in prompt shown at the top of the cabinet when signed out. Magic link;
// on return, browser data auto-links to the account (see AutoLink).
export default function LoginBlock() {
  const t = useTranslations('cabinet')
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
    <div className="rounded-lg bg-accent-soft p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-accent">
          <IconMail className="h-6 w-6" stroke={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{t('loginTitle')}</p>
          <p className="mt-0.5 text-meta text-slate-600">{t('loginBody')}</p>
          {status === 'sent' ? (
            <p className="mt-3 text-meta font-semibold text-green-700">{t('loginSent', { email })}</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-3">
              {/* Field with an inner action (§Эффекты). */}
              <div className="field-action min-h-12">
                <span className="field-action__icon">
                  <IconMail className="h-5 w-5" stroke={2} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-action__field min-h-11 text-body"
                />
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="field-action__btn focus-ring min-h-11 px-4 text-body"
                >
                  <span>{status === 'sending' ? t('loginSending') : t('login')}</span>
                  <IconArrowRight className="field-action__arrow h-5 w-5" stroke={2} />
                </button>
              </div>
              {status === 'error' && <p className="mt-1 text-meta text-red-700">{message}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

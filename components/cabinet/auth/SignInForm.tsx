'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, Input, describedBy } from '@/components/ui/Input'
import { resendSignupEmail, signInWithPassword } from '@/lib/auth/cabinet-auth'
import type { AuthProblem } from '@/lib/auth/errors'
import { useAuthText } from './useAuthText'

export default function SignInForm({
  email,
  onEmail,
  onForgot,
  onMagicLink,
}: {
  email: string
  onEmail: (email: string) => void
  onForgot: () => void
  onMagicLink: () => void
}) {
  const t = useTranslations('cabinetAuth')
  const text = useAuthText()
  const locale = useLocale()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [resent, setResent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setProblem(null)
    setResent(false)
    const res = await signInWithPassword(email, password)
    if (res.ok) {
      // The layout is a server component: re-render it with the new session.
      router.refresh()
      return
    }
    setBusy(false)
    setProblem(res.problem)
  }

  async function onResend() {
    setBusy(true)
    const res = await resendSignupEmail(email, locale)
    setBusy(false)
    if (res.ok) {
      setResent(true)
      setProblem(null)
    } else {
      setProblem(res.problem)
    }
  }

  const err = problem ? text(problem) : null
  return (
    <form onSubmit={onSubmit}>
      <Field id="si-email" label={t('email')}>
        <Input
          id="si-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
      </Field>
      <Field id="si-password" label={t('password')} error={err}>
        <Input
          id="si-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={problem === 'invalidCredentials' || undefined}
          aria-describedby={describedBy('si-password', null, err)}
        />
      </Field>
      {problem === 'emailNotConfirmed' && (
        <Button variant="link" onClick={onResend} disabled={busy}>
          {t('resendCta')}
        </Button>
      )}
      {resent && (
        <p className="msg-ok" role="status">
          {t('sentResend', { email })}
        </p>
      )}
      <Button type="submit" variant="ink" disabled={busy}>
        {busy ? t('working') : t('signInCta')}
      </Button>
      <p className="auth-alt">
        <Button variant="link" onClick={onForgot}>
          {t('forgot')}
        </Button>
        <Button variant="link" onClick={onMagicLink}>
          {t('magicLink')}
        </Button>
      </p>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, Input, describedBy } from '@/components/ui/Input'
import { signUpWithPassword } from '@/lib/auth/cabinet-auth'
import type { AuthProblem } from '@/lib/auth/errors'
import { checkPassword, PASSWORD_MIN, type PasswordProblem } from '@/lib/auth/password'
import { useAuthText } from './useAuthText'

export default function SignUpForm({ email, onEmail }: { email: string; onEmail: (email: string) => void }) {
  const t = useTranslations('cabinetAuth')
  const text = useAuthText()
  const locale = useLocale()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | PasswordProblem | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const weak = checkPassword(password)
    if (weak) {
      setProblem(weak)
      return
    }
    setBusy(true)
    setProblem(null)
    const res = await signUpWithPassword(email, password, locale)
    setBusy(false)
    if (res.ok) setSent(true)
    else setProblem(res.problem)
  }

  if (sent) {
    return (
      <p className="msg-ok" role="status">
        {t('sentSignUp', { email })}
      </p>
    )
  }

  const hint = t('passwordHint', { min: PASSWORD_MIN })
  const err = problem ? text(problem) : null
  return (
    <form onSubmit={onSubmit}>
      <Field id="su-email" label={t('email')}>
        <Input
          id="su-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
      </Field>
      <Field id="su-password" label={t('password')} hint={hint} error={err}>
        <Input
          id="su-password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={problem !== null || undefined}
          aria-describedby={describedBy('su-password', hint, err)}
        />
      </Field>
      <Button type="submit" variant="ink" disabled={busy}>
        {busy ? t('working') : t('signUpCta')}
      </Button>
    </form>
  )
}

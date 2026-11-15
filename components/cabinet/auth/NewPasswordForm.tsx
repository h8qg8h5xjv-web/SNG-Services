'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { Field, Input, describedBy } from '@/components/ui/Input'
import { setNewPassword } from '@/lib/auth/cabinet-auth'
import type { AuthProblem } from '@/lib/auth/errors'
import { checkPassword, PASSWORD_MIN, type PasswordProblem } from '@/lib/auth/password'
import { useAuthText } from './useAuthText'

// Reached from the Reset password email: auth/confirm verified the recovery
// token, so there is a session and updateUser can set the password.
export default function NewPasswordForm({ email }: { email: string | null }) {
  const t = useTranslations('cabinetAuth')
  const text = useAuthText()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | PasswordProblem | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const weak = checkPassword(password, repeat)
    if (weak) {
      setProblem(weak)
      return
    }
    setBusy(true)
    setProblem(null)
    const res = await setNewPassword(password)
    if (res.ok) {
      setSaved(true)
      router.replace('/cabinet/requests')
      router.refresh()
      return
    }
    setBusy(false)
    setProblem(res.problem)
  }

  if (saved) {
    return (
      <p className="msg-ok" role="status">
        {t('newPasswordSaved')}
      </p>
    )
  }

  const hint = t('passwordHint', { min: PASSWORD_MIN })
  const err = problem ? text(problem) : null
  return (
    <form onSubmit={onSubmit}>
      {/* Lets password managers file the new password under the right account. */}
      {email && <input type="email" autoComplete="username" value={email} readOnly hidden />}
      <Field id="np-password" label={t('newPassword')} hint={hint}>
        <Input
          id="np-password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={describedBy('np-password', hint, null)}
        />
      </Field>
      <Field id="np-repeat" label={t('repeatPassword')} error={err}>
        <Input
          id="np-repeat"
          type="password"
          required
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          aria-invalid={problem !== null || undefined}
          aria-describedby={describedBy('np-repeat', null, err)}
        />
      </Field>
      <Button type="submit" variant="ink" disabled={busy}>
        {busy ? t('working') : t('newPasswordCta')}
      </Button>
    </form>
  )
}

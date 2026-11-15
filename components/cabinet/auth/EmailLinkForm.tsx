'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Field, Input, describedBy } from '@/components/ui/Input'
import { sendMagicLink, sendPasswordReset } from '@/lib/auth/cabinet-auth'
import type { AuthProblem } from '@/lib/auth/errors'
import { useAuthText } from './useAuthText'

// «Забыли пароль?» and «Войти по ссылке на почту»: both just email a link.
export default function EmailLinkForm({
  kind,
  email,
  onEmail,
  onBack,
}: {
  kind: 'reset' | 'magic'
  email: string
  onEmail: (email: string) => void
  onBack: () => void
}) {
  const t = useTranslations('cabinetAuth')
  const text = useAuthText()
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<AuthProblem | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setProblem(null)
    const res = kind === 'reset' ? await sendPasswordReset(email, locale) : await sendMagicLink(email, locale)
    setBusy(false)
    if (res.ok) setSent(true)
    else setProblem(res.problem)
  }

  const back = (
    <p className="auth-alt">
      <Button variant="link" onClick={onBack}>
        {t('withPassword')}
      </Button>
    </p>
  )

  if (sent) {
    return (
      <div className="cab-auth-done">
        <p className="msg-ok" role="status">
          {kind === 'reset' ? t('sentReset', { email }) : t('sentMagic', { email })}
        </p>
        {back}
      </div>
    )
  }

  const id = `el-${kind}`
  const err = problem ? text(problem) : null
  return (
    <form onSubmit={onSubmit}>
      <p className="muted">{kind === 'reset' ? t('forgotIntro') : t('magicIntro')}</p>
      <Field id={id} label={t('email')} error={err}>
        <Input
          id={id}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          aria-describedby={describedBy(id, null, err)}
        />
      </Field>
      <Button type="submit" variant="ink" disabled={busy}>
        {busy ? t('working') : kind === 'reset' ? t('forgotCta') : t('magicCta')}
      </Button>
      {back}
    </form>
  )
}

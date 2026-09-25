'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ButtonLink } from '@/components/ui/Button'
import { acceptCardInvite } from '@/lib/cabinet/invite-actions'

// Runs the invite claim once the page loads (user is already signed in here).
export default function ClaimCard({ token }: { token: string }) {
  const t = useTranslations('cabinet.claim')
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const res = await acceptCardInvite(token)
      setState(res.ok ? 'done' : 'error')
    })()
  }, [token])

  if (state === 'working')
    return (
      <p className="muted" role="status">
        {t('working')}
      </p>
    )
  if (state === 'error')
    return (
      <p className="msg-err-inline" role="alert">
        {t('invalid')}
      </p>
    )
  return (
    <div className="grid justify-items-start gap-3">
      <p className="msg-ok" role="status">
        {t('success')}
      </p>
      <ButtonLink href="/cabinet/cards" variant="ink">
        {t('toCards')}
      </ButtonLink>
    </div>
  )
}

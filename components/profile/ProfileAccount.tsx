'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { pushSync, pullSync } from '@/lib/sync/actions'
import { getSavedRequests, mergeRequests } from '@/lib/requests/local-store'
import { getSavedSnapshot, setSaved } from '@/lib/saved/store'

// §3 optional magic-link. Signed out: everything works per-device. Signed in:
// back up this device's saved + requests to the account and restore them on
// another device. Sync is explicit (two buttons) — the live save UI is unchanged.
export default function ProfileAccount() {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      setReady(true)
    })
  }, [])

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setStatus('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/${locale}/profile/auth/confirm`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    })
    setPending(false)
    setStatus(error ? error.message : t('linkSent', { email }))
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserEmail(null)
  }

  async function backup() {
    setPending(true)
    setStatus('')
    const res = await pushSync({ saved: [...getSavedSnapshot()], requests: getSavedRequests() })
    setPending(false)
    setStatus(res.ok ? t('syncDone') : res.error)
  }

  async function restore() {
    setPending(true)
    setStatus('')
    const res = await pullSync()
    if (res.ok) {
      setSaved(res.data.saved)
      mergeRequests(res.data.requests)
      setStatus(t('restoreDone'))
    } else {
      setStatus(res.error)
    }
    setPending(false)
  }

  if (!ready) return null

  if (!userEmail) {
    return (
      <div>
        <p className="mb-2 text-meta text-slate-500">{t('loginHint')}</p>
        <form onSubmit={sendLink} className="flex flex-wrap items-center gap-2">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-56" />
          <Button type="submit" variant="secondary" disabled={pending}>
            {t('login')}
          </Button>
        </form>
        {status && <p className="mt-2 text-meta text-slate-500">{status}</p>}
      </div>
    )
  }

  return (
    <div>
      <p className="text-body">{t('signedInAs', { email: userEmail })}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={backup} disabled={pending}>
          {t('syncNow')}
        </Button>
        <Button variant="secondary" onClick={restore} disabled={pending}>
          {t('restore')}
        </Button>
        <Button variant="secondary" onClick={signOut} disabled={pending}>
          {t('signOut')}
        </Button>
      </div>
      {status && <p className="mt-2 text-meta text-slate-500">{status}</p>}
    </div>
  )
}

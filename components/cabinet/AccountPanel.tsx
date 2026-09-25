'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconDownload } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
import { saveAccountName, deleteMyAccount } from '@/lib/cabinet/actions'
import { getSavedRequests, clearRequests } from '@/lib/requests/local-store'
import { getSavedSnapshot, clearSaved } from '@/lib/saved/store'
import { getGuestRequestState } from '@/lib/requests/guest'

// Signed-in account controls: public name, email, data export, delete account.
export default function AccountPanel({
  email,
  name,
}: {
  email: string | null
  name: string | null
}) {
  const t = useTranslations('cabinet.account')
  const locale = useLocale()
  const router = useRouter()
  const [nameValue, setNameValue] = useState(name ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [word, setWord] = useState('')
  const [error, setError] = useState('')
  const [savingName, startSaveName] = useTransition()
  const [deleting, startDelete] = useTransition()
  const confirmWord = t('deleteWord')

  function saveName() {
    setNameSaved(false)
    startSaveName(async () => {
      const res = await saveAccountName(nameValue)
      if (res.ok) setNameSaved(true)
      else setError(res.error)
    })
  }

  async function download() {
    const requests = getSavedRequests()
    const states: Record<string, unknown> = {}
    for (const r of requests) states[r.ref] = await getGuestRequestState(r.ref, r.token)
    const payload = { exportedAt: new Date().toISOString(), email, name: nameValue, saved: [...getSavedSnapshot()], requests, requestStates: states }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sng-my-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function remove() {
    setError('')
    if (word.trim().toUpperCase() !== confirmWord.toUpperCase()) {
      setError(t('deleteMismatch', { word: confirmWord }))
      return
    }
    startDelete(async () => {
      const res = await deleteMyAccount()
      if (!res.ok) {
        setError(res.error)
        return
      }
      clearRequests()
      clearSaved()
      try {
        await createClient().auth.signOut()
      } catch {
        // ignore
      }
      router.push(`/${locale}/cabinet`)
      router.refresh()
    })
  }

  return (
    <div className="acc-form">
      <Field id="acc-name" label={t('name')} hint={t('nameHint')}>
        <div className="acc-row">
          <Input
            id="acc-name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder={t('namePlaceholder')}
            autoComplete="name"
            aria-describedby="acc-name-hint"
          />
          <Button variant="ink" onClick={saveName} disabled={savingName}>
            {t('save')}
          </Button>
        </div>
      </Field>
      {nameSaved && (
        <p className="msg-ok" role="status">
          {t('saved')}
        </p>
      )}

      <div className="field">
        <span className="lbl">{t('email')}</span>
        <p>{email}</p>
      </div>

      <div>
        <Button variant="line" onClick={download}>
          <IconDownload stroke={1.75} aria-hidden="true" />
          {t('download')}
        </Button>
      </div>

      <div className="danger">
        <b>{t('deleteTitle')}</b>
        <p className="muted">{t('deleteWhat')}</p>
        <label htmlFor="acc-del" className="muted">
          {t('deleteHint', { word: confirmWord })}
        </label>
        <div className="acc-row">
          <Input id="acc-del" value={word} onChange={(e) => setWord(e.target.value)} placeholder={confirmWord} autoComplete="off" />
          <Button variant="line" onClick={remove} disabled={deleting}>
            {deleting ? '…' : t('deleteButton')}
          </Button>
        </div>
        {error && (
          <p className="msg-err-inline" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

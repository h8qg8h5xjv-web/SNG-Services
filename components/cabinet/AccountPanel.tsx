'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('name')}</label>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder={t('namePlaceholder')} className="w-64" />
          <Button variant="secondary" onClick={saveName} disabled={savingName}>
            {t('save')}
          </Button>
          {nameSaved && <span className="text-meta text-green-700">{t('saved')}</span>}
        </div>
        <p className="mt-1 text-meta text-slate-500">{t('nameHint')}</p>
      </div>

      <div>
        <label className="mb-1 block text-body text-slate-500">{t('email')}</label>
        <p className="text-body">{email}</p>
      </div>

      <div>
        <Button variant="secondary" onClick={download}>
          {t('download')}
        </Button>
      </div>

      <div className="rounded-lg border border-red-200 p-4">
        <p className="text-body font-semibold">{t('deleteTitle')}</p>
        <p className="mt-1 text-meta text-slate-500">{t('deleteWhat')}</p>
        <p className="mt-1 text-meta text-slate-500">{t('deleteHint', { word: confirmWord })}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder={confirmWord} className="w-40" />
          <Button variant="secondary" onClick={remove} disabled={deleting}>
            {deleting ? '…' : t('deleteButton')}
          </Button>
        </div>
        {error && <p className="mt-2 text-meta text-red-700">{error}</p>}
      </div>
    </div>
  )
}

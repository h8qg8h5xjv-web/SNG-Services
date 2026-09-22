'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getSavedRequests, clearRequests } from '@/lib/requests/local-store'
import { getSavedSnapshot, clearSaved } from '@/lib/saved/store'
import { getGuestRequestState, deleteGuestData } from '@/lib/requests/guest'

// §3 GDPR + App Store: export everything we hold about this user as JSON, and
// delete it (requests + bookings on the server, saved locally) behind a typed
// confirmation.
export default function DataControls() {
  const t = useTranslations('profile')
  const [word, setWord] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const confirmWord = t('deleteWord')

  async function download() {
    const requests = getSavedRequests()
    const states: Record<string, unknown> = {}
    for (const r of requests) {
      states[r.ref] = await getGuestRequestState(r.ref, r.token)
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      saved: [...getSavedSnapshot()],
      requests,
      requestStates: states,
    }
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
    startTransition(async () => {
      const refs = getSavedRequests().map((r) => ({ ref: r.ref, token: r.token }))
      await deleteGuestData(refs)
      clearRequests()
      clearSaved()
      setDone(true)
    })
  }

  if (done) return <p className="rounded-lg border border-green-200 bg-green-100 p-3 text-body">{t('deleteDone')}</p>

  return (
    <div className="space-y-4">
      <div>
        <Button variant="secondary" onClick={download}>
          {t('download')}
        </Button>
      </div>
      <div className="rounded-lg border border-red-200 p-4">
        <p className="text-body font-semibold">{t('deleteTitle')}</p>
        <p className="mt-1 text-meta text-slate-500">{t('deleteHint', { word: confirmWord })}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder={confirmWord} className="w-40" />
          <Button variant="secondary" onClick={remove} disabled={pending}>
            {pending ? '…' : t('deleteButton')}
          </Button>
        </div>
        {error && <p className="mt-2 text-meta text-red-700">{error}</p>}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setProviderCredential, DBS_TYPES } from '@/lib/admin/credential-actions'
import type { AdminProviderDetail } from '@/lib/admin/data'
import type { CredentialStatus, DbsType } from '@/types/database'

// An expired verified credential is read as self_declared (computed, no job).
function effectiveStatus(status: CredentialStatus, expiresAt: string | null): CredentialStatus {
  if (status === 'verified' && expiresAt && new Date(expiresAt) <= new Date()) {
    return 'self_declared'
  }
  return status
}

function Badge({ status }: { status: CredentialStatus }) {
  const map: Record<CredentialStatus, string> = {
    none: 'bg-black/5 text-foreground/60 dark:bg-white/10',
    self_declared: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    verified: 'bg-green-500/15 text-green-700 dark:text-green-400',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[status]}`}>{status}</span>
}

function CredentialCard({
  providerId,
  kind,
  title,
  status,
  expiresAt,
  documentRef,
  note,
  dbsType,
}: {
  providerId: string
  kind: 'insurance' | 'dbs'
  title: string
  status: CredentialStatus
  expiresAt: string | null
  documentRef: string | null
  note: string | null
  dbsType: DbsType | null
}) {
  const router = useRouter()
  const [ref, setRef] = useState(documentRef ?? '')
  const [noteText, setNoteText] = useState(note ?? '')
  const [expiry, setExpiry] = useState(expiresAt ?? '')
  const [type, setType] = useState<DbsType>(dbsType ?? 'enhanced')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const effective = effectiveStatus(status, expiresAt)

  async function act(next: CredentialStatus) {
    setPending(true)
    setError('')
    const result = await setProviderCredential({
      providerId,
      kind,
      status: next,
      documentRef: ref.trim() === '' ? null : ref.trim(),
      note: noteText.trim() === '' ? null : noteText.trim(),
      expiresAt: expiry === '' ? null : expiry,
      dbsType: kind === 'dbs' ? type : null,
    })
    setPending(false)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {effective !== status && <span className="text-xs text-foreground/40">(истёк →)</span>}
          <Badge status={effective} />
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/60">Номер документа (без скана)</span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/60">Действует до</span>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
          />
        </label>
        {kind === 'dbs' && (
          <label className="block text-sm">
            <span className="text-foreground/60">Тип DBS (для детей нужен enhanced)</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DbsType)}
              disabled={pending}
              className="mt-1 min-h-9 w-full rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
            >
              {DBS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/60">Заметка</span>
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-black/15 bg-transparent px-2 text-sm dark:border-white/20"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => act('verified')}
          disabled={pending}
          className="rounded-lg bg-foreground px-3 py-1 font-medium text-background disabled:opacity-60"
        >
          Подтвердить (видела документ)
        </button>
        <button
          type="button"
          onClick={() => act('self_declared')}
          disabled={pending}
          className="hover:underline disabled:opacity-60"
        >
          Со слов
        </button>
        {status !== 'none' && (
          <button
            type="button"
            onClick={() => act('none')}
            disabled={pending}
            className="text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
          >
            Убрать
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function ProviderCredentials({ provider }: { provider: AdminProviderDetail }) {
  if (provider.entity_type !== 'pro') return null

  return (
    <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <h3 className="mb-1 text-sm font-medium">Страхование и DBS (только специалисты)</h3>
      <p className="mb-3 text-xs text-foreground/60">
        Отметка проверки, не хранилище документов. Скан не загружаем — только номер и факт, что
        видела. Провайдер может заявить «со слов», подтвердить — только админ.
      </p>
      <div className="space-y-3">
        <CredentialCard
          providerId={provider.id}
          kind="insurance"
          title="Public liability insurance"
          status={provider.insurance_status}
          expiresAt={provider.insurance_expires_at}
          documentRef={provider.insurance_document_ref}
          note={provider.insurance_note}
          dbsType={null}
        />
        <CredentialCard
          providerId={provider.id}
          kind="dbs"
          title="DBS (работа с детьми)"
          status={provider.dbs_status}
          expiresAt={provider.dbs_expires_at}
          documentRef={provider.dbs_document_ref}
          note={provider.dbs_note}
          dbsType={provider.dbs_type}
        />
      </div>
    </section>
  )
}

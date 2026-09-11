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
    none: 'bg-slate-100 text-slate-500 ',
    self_declared: 'bg-slate-100 text-slate-500',
    verified: 'bg-green-100 text-green-700',
  }
  return <span className={`rounded-full px-2 py-1 text-meta ${map[status]}`}>{status}</span>
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
  refLabel = 'Номер документа (без скана)',
}: {
  providerId: string
  kind: 'insurance' | 'dbs' | 'gas_safe' | 'electrical'
  title: string
  status: CredentialStatus
  expiresAt: string | null
  documentRef: string | null
  note: string | null
  dbsType: DbsType | null
  refLabel?: string
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
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          {effective !== status && <span className="text-meta text-slate-400">(истёк →)</span>}
          <Badge status={effective} />
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block text-body">
          <span className="text-slate-500">{refLabel}</span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-body"
          />
        </label>
        <label className="block text-body">
          <span className="text-slate-500">Действует до</span>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-body"
          />
        </label>
        {kind === 'dbs' && (
          <label className="block text-body">
            <span className="text-slate-500">Тип DBS (для детей нужен enhanced)</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DbsType)}
              disabled={pending}
              className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-body"
            >
              {DBS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-body sm:col-span-2">
          <span className="text-slate-500">Заметка</span>
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={pending}
            className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 text-body"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-body">
        <button
          type="button"
          onClick={() => act('verified')}
          disabled={pending}
          className="rounded-lg bg-teal-700 px-3 py-1 font-semibold text-white disabled:opacity-60"
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
            className="text-red-700 hover:underline disabled:opacity-60"
          >
            Убрать
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-body text-red-700">{error}</p>}
    </div>
  )
}

export default function ProviderCredentials({ provider }: { provider: AdminProviderDetail }) {
  if (provider.entity_type !== 'pro') return null

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-1 text-body font-semibold">
        Страхование, DBS и регулируемые работы (только специалисты)
      </h3>
      <p className="mb-3 text-meta text-slate-500">
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
        <CredentialCard
          providerId={provider.id}
          kind="gas_safe"
          title="Gas Safe (газовые работы)"
          status={provider.gas_safe_status}
          expiresAt={provider.gas_safe_expires_at}
          documentRef={provider.gas_safe_number}
          note={provider.gas_safe_note}
          dbsType={null}
          refLabel="Номер Gas Safe (проверяется по публичному реестру)"
        />
        <CredentialCard
          providerId={provider.id}
          kind="electrical"
          title="Электрика (competent person scheme, Part P)"
          status={provider.electrical_status}
          expiresAt={provider.electrical_expires_at}
          documentRef={provider.electrical_scheme}
          note={provider.electrical_note}
          dbsType={null}
          refLabel="Схема и номер (NICEIC, NAPIT и т. п.)"
        />
      </div>
      <p className="mt-3 text-meta text-slate-500">
        Без подтверждения регулируемая категория (газ, электрика) для мастера закрыта:
        заявки с такой работой ему не приходят вообще, а не «показываются с предупреждением».
      </p>
    </section>
  )
}

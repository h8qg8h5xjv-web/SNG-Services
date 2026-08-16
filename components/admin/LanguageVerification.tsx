'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  setLanguageVerification,
  VERIFICATION_METHODS,
} from '@/lib/admin/language-actions'
import type { AdminProviderLanguage } from '@/lib/admin/data'
import type { Language } from '@/types'
import type { LanguageVerificationMethod } from '@/types/database'

const METHOD_LABEL: Record<LanguageVerificationMethod, string> = {
  seed: 'seed (demo)',
  call: 'Звонок',
  voice_sample: 'Голосовое',
  video_call: 'Видеозвонок',
}

function StatusBadge({ lang }: { lang: AdminProviderLanguage }) {
  const expired =
    lang.status === 'verified' &&
    lang.expires_at !== null &&
    new Date(lang.expires_at) <= new Date()

  if (expired) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-meta text-slate-500">
        verified · expired
      </span>
    )
  }
  if (lang.status === 'verified') {
    const seed = lang.method === 'seed'
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-meta ${
          seed
            ? 'bg-slate-100 text-slate-500'
            : 'bg-green-100 text-green-700'
        }`}
      >
        ✓ verified{seed ? ' · seed' : ''}
      </span>
    )
  }
  if (lang.status === 'rejected') {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-meta text-red-700">
        rejected
      </span>
    )
  }
  return (
    <span className="rounded-full bg-black/5 px-2 py-0.5 text-meta text-slate-500">
      claimed
    </span>
  )
}

function LanguageRow({
  providerId,
  lang,
  name,
  showProfessional,
}: {
  providerId: string
  lang: AdminProviderLanguage
  name: string
  showProfessional: boolean
}) {
  const router = useRouter()
  const [method, setMethod] = useState<LanguageVerificationMethod>(
    lang.method && lang.method !== 'seed' ? lang.method : 'call',
  )
  const [note, setNote] = useState(lang.note ?? '')
  const [professional, setProfessional] = useState(lang.professional_level)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function act(status: 'verified' | 'rejected' | 'claimed') {
    setPending(true)
    setError('')
    const result = await setLanguageVerification({
      providerId,
      languageCode: lang.language_code,
      status,
      method: status === 'verified' ? method : null,
      note: note.trim() === '' ? null : note.trim(),
      expiresAt: null,
      professionalLevel: status === 'verified' ? professional : false,
    })
    setPending(false)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-semibold">
          {name} <span className="text-slate-400">({lang.language_code})</span>
        </span>
        <StatusBadge lang={lang} />
      </div>

      {lang.method === 'seed' && (
        <p className="mt-1 text-meta text-slate-500">
          Подтверждение из сида — не настоящая проверка.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as LanguageVerificationMethod)}
          disabled={pending}
          className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-body"
        >
          {VERIFICATION_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Заметка"
          disabled={pending}
          className="min-h-9 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 text-body"
        />
      </div>

      {showProfessional && (
        <label className="mt-2 inline-flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={professional}
            onChange={(e) => setProfessional(e.target.checked)}
            disabled={pending}
          />
          Профессиональный уровень (для документов и диагнозов)
        </label>
      )}

      {lang.status === 'verified' && lang.expires_at && (
        <p className="mt-1 text-meta text-slate-500">
          Действует до {new Date(lang.expires_at).toLocaleDateString('ru-RU')}
          {lang.professional_level ? ' · проф.' : ''}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-body">
        <button
          type="button"
          onClick={() => act('verified')}
          disabled={pending}
          className="rounded-lg bg-teal-700 px-3 py-1 font-semibold text-white disabled:opacity-60"
        >
          Подтвердить
        </button>
        <button
          type="button"
          onClick={() => act('rejected')}
          disabled={pending}
          className="text-red-700 hover:underline disabled:opacity-60"
        >
          Отклонить
        </button>
        {lang.status !== 'claimed' && (
          <button
            type="button"
            onClick={() => act('claimed')}
            disabled={pending}
            className="text-slate-500 hover:underline disabled:opacity-60"
          >
            Сбросить
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-body text-red-700">{error}</p>}
    </div>
  )
}

// professional_level only matters where the conversation is about documents or
// diagnoses (DESIGN «Уровень»).
const PROFESSIONAL_CATEGORIES = new Set(['legal', 'health'])

export default function LanguageVerification({
  providerId,
  categorySlug,
  languages,
  reference,
}: {
  providerId: string
  categorySlug: string | null
  languages: AdminProviderLanguage[]
  reference: Language[]
}) {
  const nameOf = (code: string) =>
    reference.find((l) => l.code === code)?.name_native ?? code
  const showProfessional = categorySlug !== null && PROFESSIONAL_CATEGORIES.has(categorySlug)

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-1 text-body font-semibold">Проверка языков</h3>
      <p className="mb-3 text-meta text-slate-500">
        Публикация требует хотя бы один язык со статусом verified. Провайдер может
        заявить язык, подтвердить — только админ.
      </p>
      {languages.length === 0 ? (
        <p className="text-body text-slate-500">Языки ещё не заявлены.</p>
      ) : (
        <div className="space-y-3">
          {[...languages]
            .sort((a, b) => a.language_code.localeCompare(b.language_code))
            .map((lang) => (
              <LanguageRow
                key={lang.language_code}
                providerId={providerId}
                lang={lang}
                name={nameOf(lang.language_code)}
                showProfessional={showProfessional}
              />
            ))}
        </div>
      )}
    </section>
  )
}

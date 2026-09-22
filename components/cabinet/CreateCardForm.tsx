'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { createMyCard } from '@/lib/cabinet/actions'

// Self-serve card creation (name, category, borough, phone, languages, services
// line). Creates a draft and opens it for editing.
export default function CreateCardForm({
  categories,
  languages,
}: {
  categories: { id: string; name: string }[]
  languages: { code: string; name: string }[]
}) {
  const t = useTranslations('cabinet.cards')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [borough, setBorough] = useState('')
  const [phone, setPhone] = useState('')
  const [langs, setLangs] = useState<string[]>([])
  const [servicesLine, setServicesLine] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function toggleLang(code: string) {
    setLangs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function submit() {
    setError('')
    startTransition(async () => {
      const res = await createMyCard({ name, categoryId, borough, phone, languages: langs, servicesLine })
      if (res.ok) router.push(`/cabinet/cards/${res.id}`)
      else setError(res.error)
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>{t('create')}</Button>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input placeholder={t('borough')} value={borough} onChange={(e) => setBorough(e.target.value)} className="w-full" />
        <Input type="tel" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-meta text-slate-500">{t('languages')}</p>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => toggleLang(l.code)}
              className={`min-h-9 rounded-full border px-3 text-meta transition-colors ${langs.includes(l.code) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Input
          value={servicesLine}
          onChange={(e) => setServicesLine(e.target.value)}
          placeholder={t('servicesPlaceholder')}
          className="w-full"
        />
        <p className="mt-1 text-meta text-slate-500">{t('servicesHint')}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !name.trim() || !borough.trim()}>
          {pending ? t('creating') : t('createSubmit')}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          {t('cancel')}
        </Button>
        {error && <span className="text-meta text-red-700">{error}</span>}
      </div>
    </div>
  )
}

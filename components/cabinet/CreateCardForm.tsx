'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { IconPlus } from '@tabler/icons-react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
import Select from '@/components/ui/Select'
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
  const tt = useTranslations('business.tabs')
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
      <div>
        <Button variant="ink" onClick={() => setOpen(true)}>
          <IconPlus stroke={1.75} aria-hidden="true" />
          {t('create')}
        </Button>
      </div>
    )
  }

  return (
    <div className="card ed-sec">
      <div className="ed-grid">
        <Field id="cc-name" label={t('name')}>
          <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
        </Field>
        <div className="field">
          <span className="lbl">{t('category')}</span>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            ariaLabel={t('category')}
            title={t('category')}
            placeholder={t('category')}
            className="w-full"
          />
        </div>
        <Field id="cc-borough" label={t('borough')}>
          <Input id="cc-borough" value={borough} onChange={(e) => setBorough(e.target.value)} />
        </Field>
        <Field id="cc-phone" label={t('phone')}>
          <Input id="cc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
      </div>

      <div className="field">
        <span className="lbl" id="cc-langs">
          {t('languages')}
        </span>
        <div className="dchips" role="group" aria-labelledby="cc-langs">
          {languages.map((l) => (
            <FilterChip key={l.code} look="dchip" active={langs.includes(l.code)} onClick={() => toggleLang(l.code)}>
              {l.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <Field id="cc-services" label={tt('services')} hint={t('servicesHint')}>
        <Input
          id="cc-services"
          value={servicesLine}
          onChange={(e) => setServicesLine(e.target.value)}
          placeholder={t('servicesPlaceholder')}
          aria-describedby="cc-services-hint"
        />
      </Field>

      <div className="ed-acts">
        <Button variant="ink" onClick={submit} disabled={pending || !name.trim() || !borough.trim()}>
          {pending ? t('creating') : t('createSubmit')}
        </Button>
        <Button variant="line" onClick={() => setOpen(false)} disabled={pending}>
          {t('cancel')}
        </Button>
        {error && (
          <span className="msg-err-inline" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

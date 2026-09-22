'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { quickCreateMaster } from '@/lib/admin/quick-master-actions'

// §10 fast master entry. Admin UI — English, palette only. Creates a draft; the
// admin finishes it in the full form. Services line: "Name price£ minutes; …".
export default function QuickMaster({
  categories,
  languages,
}: {
  categories: { id: string; name_en: string }[]
  languages: { code: string; name_native: string }[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [borough, setBorough] = useState('')
  const [phone, setPhone] = useState('')
  const [langs, setLangs] = useState<string[]>([])
  const [servicesLine, setServicesLine] = useState('')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [pending, startTransition] = useTransition()

  function toggleLang(code: string) {
    setLangs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function submit() {
    setError('')
    setOkMsg('')
    startTransition(async () => {
      const res = await quickCreateMaster({ name, categoryId, borough, phone, languages: langs, servicesLine })
      if (res.ok) {
        setName('')
        setBorough('')
        setPhone('')
        setLangs([])
        setServicesLine('')
        setOkMsg('Created as draft — open Providers to finish it.')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const field = 'min-h-9 rounded-lg border border-slate-300 px-3 text-body'

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h2 className="mb-3 text-body font-semibold">Quick master</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
        <input className={field} placeholder="Borough" value={borough} onChange={(e) => setBorough(e.target.value)} />
        <input className={field} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-meta text-slate-500">Languages</p>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => toggleLang(l.code)}
              className={`min-h-9 rounded-full border px-3 text-meta ${langs.includes(l.code) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
            >
              {l.name_native}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <input
          className={`${field} w-full`}
          placeholder="Services: Стрижка 25 60; Маникюр 30 90"
          value={servicesLine}
          onChange={(e) => setServicesLine(e.target.value)}
        />
        <p className="mt-1 text-meta text-slate-500">Each: name, price £, minutes. Separate with ;</p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="min-h-9 rounded-lg bg-slate-900 px-4 text-body text-white disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create draft'}
        </button>
        {okMsg && <span className="text-meta text-green-700">{okMsg}</span>}
        {error && <span className="text-meta text-red-700">{error}</span>}
      </div>
    </section>
  )
}

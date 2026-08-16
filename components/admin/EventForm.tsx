'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveEvent, deleteEvent } from '@/lib/admin/event-actions'
import { EVENT_CATEGORIES } from '@/lib/events/constants'
import ImageUpload from './ImageUpload'
import type { AdminEventDetail } from '@/lib/admin/data'

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export default function EventForm({
  event,
  providerOptions,
}: {
  event: AdminEventDetail | null
  providerOptions: { id: string; name_en: string }[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [coverImage, setCoverImage] = useState<string | null>(event?.cover_image ?? null)

  const [f, setF] = useState({
    slug: event?.slug ?? '',
    title_en: event?.title_en ?? '',
    title_ru: event?.title_ru ?? '',
    description_en: event?.description_en ?? '',
    description_ru: event?.description_ru ?? '',
    category: event?.category ?? EVENT_CATEGORIES[0],
    starts_at: toLocalInput(event?.starts_at ?? null),
    ends_at: toLocalInput(event?.ends_at ?? null),
    venue_name: event?.venue_name ?? '',
    address: event?.address ?? '',
    lat: event?.lat?.toString() ?? '',
    lng: event?.lng?.toString() ?? '',
    borough: event?.borough ?? '',
    price_from_pence: event?.price_from_pence?.toString() ?? '',
    ticket_url: event?.ticket_url ?? '',
    organizer_provider_id: event?.organizer_provider_id ?? '',
    languages: (event?.languages ?? []).join(', '),
    status: event?.status ?? 'draft',
  })
  const set = (key: keyof typeof f, value: string) =>
    setF((prev) => ({ ...prev, [key]: value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setFormError('')
    setErrors({})
    const payload = {
      slug: f.slug.trim(),
      title_en: f.title_en.trim(),
      title_ru: orNull(f.title_ru),
      description_en: orNull(f.description_en),
      description_ru: orNull(f.description_ru),
      category: f.category,
      starts_at: f.starts_at,
      ends_at: orNull(f.ends_at),
      venue_name: orNull(f.venue_name),
      address: orNull(f.address),
      lat: numOrNull(f.lat),
      lng: numOrNull(f.lng),
      borough: orNull(f.borough),
      price_from_pence: numOrNull(f.price_from_pence),
      ticket_url: orNull(f.ticket_url),
      organizer_provider_id: orNull(f.organizer_provider_id),
      languages: f.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      cover_image: coverImage,
      status: f.status,
    }
    const result = await saveEvent(event?.id ?? null, payload)
    setPending(false)
    if (result.ok) {
      router.push('/admin/events')
      router.refresh()
    } else {
      setFormError(result.formError ?? '')
      setErrors(result.fieldErrors ?? {})
    }
  }

  async function onDelete() {
    if (!event || !confirm('Delete this event?')) return
    setPending(true)
    const result = await deleteEvent(event.id)
    setPending(false)
    if (result.ok) {
      router.push('/admin/events')
      router.refresh()
    } else {
      setFormError(result.formError ?? '')
    }
  }

  const errorEntries = Object.entries(errors)

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {(formError || errorEntries.length > 0) && (
        <div className="rounded-lg bg-red-100 p-3 text-body">
          {formError && <p>{formError}</p>}
          <ul className="list-inside list-disc">
            {errorEntries.map(([key, msg]) => (
              <li key={key}>
                <strong>{key}</strong>: {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" value={f.slug} onChange={(v) => set('slug', v)} required />
        <label className="block text-body">
          <span className="text-slate-500">Category</span>
          <select
            value={f.category}
            onChange={(e) => set('category', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
          >
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title (EN)" value={f.title_en} onChange={(v) => set('title_en', v)} required />
        <Field label="Title (RU)" value={f.title_ru} onChange={(v) => set('title_ru', v)} />
      </div>

      <label className="block text-body">
        <span className="text-slate-500">Description (EN)</span>
        <textarea
          value={f.description_en}
          onChange={(e) => set('description_en', e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-3"
        />
      </label>
      <label className="block text-body">
        <span className="text-slate-500">Description (RU)</span>
        <textarea
          value={f.description_ru}
          onChange={(e) => set('description_ru', e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-3"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-body">
          <span className="text-slate-500">Starts at</span>
          <input
            type="datetime-local"
            value={f.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            required
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
          />
        </label>
        <label className="block text-body">
          <span className="text-slate-500">Ends at (optional)</span>
          <input
            type="datetime-local"
            value={f.ends_at}
            onChange={(e) => set('ends_at', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue" value={f.venue_name} onChange={(v) => set('venue_name', v)} />
        <Field label="Borough" value={f.borough} onChange={(v) => set('borough', v)} />
        <Field label="Address" value={f.address} onChange={(v) => set('address', v)} />
        <Field
          label="Price from (pence, empty = free)"
          value={f.price_from_pence}
          onChange={(v) => set('price_from_pence', v)}
        />
        <Field label="Latitude" value={f.lat} onChange={(v) => set('lat', v)} />
        <Field label="Longitude" value={f.lng} onChange={(v) => set('lng', v)} />
        <Field
          label="Ticket URL"
          value={f.ticket_url}
          onChange={(v) => set('ticket_url', v)}
          error={errors['ticket_url']}
        />
        <Field
          label="Languages (comma separated)"
          value={f.languages}
          onChange={(v) => set('languages', v)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-body">
          <span className="text-slate-500">Organizer (provider)</span>
          <select
            value={f.organizer_provider_id}
            onChange={(e) => set('organizer_provider_id', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
          >
            <option value="">— none —</option>
            {providerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-body">
          <span className="text-slate-500">Status</span>
          <select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1 text-body text-slate-500">Cover image</p>
        <ImageUpload value={coverImage} onChange={setCoverImage} folder="events" />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-teal-700 px-6 font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {event && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="min-h-11 rounded-lg border border-red-200 px-4 text-body text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  error?: string
}) {
  return (
    <label className="block text-body">
      <span className="text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-transparent px-3"
      />
      {error && <p className="mt-1 text-body text-red-700">{error}</p>}
    </label>
  )
}

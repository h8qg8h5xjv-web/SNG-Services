'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProvider, deleteProvider } from '@/lib/admin/provider-actions'
import { TRANSLATION_LOCALES } from '@/lib/admin/schemas'
import ImageUpload from './ImageUpload'
import type { AdminProviderDetail } from '@/lib/admin/data'
import type { Category, Language } from '@/types'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

type ServiceRow = {
  id?: string
  name_en: string
  name_ru: string
  duration_min: string
  price_pence: string
  capacity: string
}
type ScheduleRow = { day_of_week: number; start_time: string; end_time: string }
type TranslationRow = { locale: string; name: string; description: string }

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))

export default function ProviderForm({
  provider,
  categories,
  languages,
}: {
  provider: AdminProviderDetail | null
  categories: Category[]
  languages: Language[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [f, setF] = useState({
    slug: provider?.slug ?? '',
    name_en: provider?.name_en ?? '',
    description_en: provider?.description_en ?? '',
    category_id: provider?.category_id ?? '',
    borough: provider?.borough ?? '',
    address: provider?.address ?? '',
    lat: provider?.lat?.toString() ?? '',
    lng: provider?.lng?.toString() ?? '',
    phone: provider?.phone ?? '',
    telegram: provider?.telegram ?? '',
    instagram: provider?.instagram ?? '',
    website: provider?.website ?? '',
    fulfillment_type: provider?.fulfillment_type ?? 'native_booking',
    external_order_url: provider?.external_order_url ?? '',
    status: provider?.status ?? 'draft',
    entity_type: provider?.entity_type ?? 'place',
    claim_status: provider?.claim_status ?? 'unclaimed',
    travel_radius_km: provider?.travel_radius_km?.toString() ?? '',
  })
  const [bookingEnabled, setBookingEnabled] = useState(provider?.booking_enabled ?? true)
  const set = (key: keyof typeof f, value: string) =>
    setF((prev) => ({ ...prev, [key]: value }))

  const [coverImage, setCoverImage] = useState<string | null>(provider?.cover_image ?? null)
  const [selectedLangs, setSelectedLangs] = useState<string[]>(
    provider?.provider_languages.map((l) => l.language_code) ?? [],
  )
  const [translations, setTranslations] = useState<TranslationRow[]>(
    TRANSLATION_LOCALES.map((locale) => {
      const existing = provider?.provider_translations.find((t) => t.locale === locale)
      return { locale, name: existing?.name ?? '', description: existing?.description ?? '' }
    }),
  )
  const [services, setServices] = useState<ServiceRow[]>(
    provider?.services.map((s) => ({
      id: s.id,
      name_en: s.name_en,
      name_ru: s.name_ru ?? '',
      duration_min: s.duration_min.toString(),
      price_pence: s.price_pence.toString(),
      capacity: s.capacity.toString(),
    })) ?? [],
  )
  const [schedule, setSchedule] = useState<ScheduleRow[]>(
    provider?.schedules.map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    })) ?? [],
  )

  function toggleLang(code: string) {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setFormError('')
    setErrors({})

    const payload = {
      slug: f.slug.trim(),
      name_en: f.name_en.trim(),
      description_en: f.description_en.trim(),
      category_id: f.category_id,
      borough: f.borough.trim(),
      address: orNull(f.address),
      lat: numOrNull(f.lat),
      lng: numOrNull(f.lng),
      phone: orNull(f.phone),
      telegram: orNull(f.telegram),
      instagram: orNull(f.instagram),
      website: orNull(f.website),
      cover_image: coverImage,
      fulfillment_type: f.fulfillment_type,
      external_order_url: orNull(f.external_order_url),
      status: f.status,
      entity_type: f.entity_type,
      claim_status: f.claim_status,
      booking_enabled: bookingEnabled,
      travel_radius_km: f.entity_type === 'pro' ? numOrNull(f.travel_radius_km) : null,
      languages: selectedLangs,
      translations: translations.map((t) => ({
        locale: t.locale,
        name: orNull(t.name),
        description: orNull(t.description),
      })),
      services: services.map((s) => ({
        id: s.id,
        name_en: s.name_en.trim(),
        name_ru: orNull(s.name_ru),
        description_en: null,
        description_ru: null,
        duration_min: Number(s.duration_min),
        price_pence: Number(s.price_pence),
        capacity: Number(s.capacity),
      })),
      schedule:
        f.fulfillment_type === 'native_booking'
          ? schedule.map((r) => ({
              day_of_week: Number(r.day_of_week),
              start_time: r.start_time,
              end_time: r.end_time,
            }))
          : [],
    }

    const result = await saveProvider(provider?.id ?? null, payload)
    setPending(false)
    if (result.ok) {
      router.push('/admin/providers')
      router.refresh()
    } else {
      setFormError(result.formError ?? '')
      setErrors(result.fieldErrors ?? {})
    }
  }

  async function onDelete() {
    if (!provider) return
    if (!confirm('Delete this provider?')) return
    setPending(true)
    const result = await deleteProvider(provider.id)
    setPending(false)
    if (result.ok) {
      router.push('/admin/providers')
      router.refresh()
    } else {
      setFormError(result.formError ?? '')
    }
  }

  const errorEntries = Object.entries(errors)

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {(formError || errorEntries.length > 0) && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
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
        <Field label="Name (EN)" value={f.name_en} onChange={(v) => set('name_en', v)} required />
      </div>

      <label className="block text-sm">
        <span className="text-foreground/70">Description (EN)</span>
        <textarea
          value={f.description_en}
          onChange={(e) => set('description_en', e.target.value)}
          required
          rows={3}
          className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-3 dark:border-white/20"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Category</span>
          <select
            value={f.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            required
            className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </label>
        <Field label="Borough" value={f.borough} onChange={(v) => set('borough', v)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Fulfillment</span>
          <select
            value={f.fulfillment_type}
            onChange={(e) => set('fulfillment_type', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="native_booking">native_booking</option>
            <option value="external_order">external_order</option>
            <option value="enquiry">enquiry</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Status</span>
          <select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
      </div>

      {f.fulfillment_type === 'external_order' && (
        <Field
          label="External order URL"
          value={f.external_order_url}
          onChange={(v) => set('external_order_url', v)}
          error={errors['external_order_url']}
        />
      )}

      {/* Second axis (DESIGN §2в): place vs pro, plus claim + booking toggle. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-foreground/70">Entity type</span>
          <select
            value={f.entity_type}
            onChange={(e) => set('entity_type', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="place">place — заведение</option>
            <option value="pro">pro — специалист</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Claim status</span>
          <select
            value={f.claim_status}
            onChange={(e) => set('claim_status', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="unclaimed">unclaimed</option>
            <option value="claimed">claimed</option>
            <option value="invited">invited</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={bookingEnabled}
            onChange={(e) => setBookingEnabled(e.target.checked)}
          />
          Booking enabled
        </label>
      </div>

      {f.entity_type === 'pro' && (
        <Field
          label="Travel radius (km)"
          value={f.travel_radius_km}
          onChange={(v) => set('travel_radius_km', v)}
          error={errors['travel_radius_km']}
        />
      )}

      <fieldset>
        <legend className="text-sm text-foreground/70">Service languages (CIS)</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {languages.map((l) => (
            <label key={l.code} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedLangs.includes(l.code)}
                onChange={() => toggleLang(l.code)}
              />
              {l.name_native} <span className="text-foreground/40">({l.code})</span>
            </label>
          ))}
        </div>
        {errors['languages'] && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['languages']}</p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Latitude" value={f.lat} onChange={(v) => set('lat', v)} />
        <Field label="Longitude" value={f.lng} onChange={(v) => set('lng', v)} />
        <Field label="Phone" value={f.phone} onChange={(v) => set('phone', v)} />
        <Field label="Telegram" value={f.telegram} onChange={(v) => set('telegram', v)} />
        <Field label="Instagram" value={f.instagram} onChange={(v) => set('instagram', v)} />
        <Field label="Website" value={f.website} onChange={(v) => set('website', v)} />
        <Field label="Address" value={f.address} onChange={(v) => set('address', v)} />
      </div>

      <div>
        <p className="mb-1 text-sm text-foreground/70">Cover image</p>
        <ImageUpload value={coverImage} onChange={setCoverImage} />
      </div>

      {/* Translations — the editor shows every locale so gaps are visible. */}
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <h3 className="mb-3 text-sm font-medium">Translations</h3>
        <div className="space-y-4">
          {translations.map((t, i) => (
            <div key={t.locale} className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-foreground/60">{t.locale} — name</span>
                <input
                  value={t.name}
                  onChange={(e) =>
                    setTranslations((prev) =>
                      prev.map((row, j) => (j === i ? { ...row, name: e.target.value } : row)),
                    )
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
                />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/60">
                  {t.locale} — description
                  {t.locale === 'ru' && !t.description.trim() && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">missing</span>
                  )}
                </span>
                <input
                  value={t.description}
                  onChange={(e) =>
                    setTranslations((prev) =>
                      prev.map((row, j) =>
                        j === i ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Services</h3>
          <button
            type="button"
            onClick={() =>
              setServices((prev) => [
                ...prev,
                { name_en: '', name_ru: '', duration_min: '60', price_pence: '0', capacity: '1' },
              ])
            }
            className="text-sm text-foreground/70 hover:underline"
          >
            + Add
          </button>
        </div>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <input
                placeholder="Name EN"
                value={s.name_en}
                onChange={(e) => updateRow(setServices, i, 'name_en', e.target.value)}
                className="col-span-2 min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
              />
              <input
                placeholder="Name RU"
                value={s.name_ru}
                onChange={(e) => updateRow(setServices, i, 'name_ru', e.target.value)}
                className="col-span-2 min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
              />
              <input
                placeholder="Min"
                inputMode="numeric"
                value={s.duration_min}
                onChange={(e) => updateRow(setServices, i, 'duration_min', e.target.value)}
                className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
              />
              <input
                placeholder="Pence"
                inputMode="numeric"
                value={s.price_pence}
                onChange={(e) => updateRow(setServices, i, 'price_pence', e.target.value)}
                className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
              />
              <input
                placeholder="Cap"
                inputMode="numeric"
                value={s.capacity}
                onChange={(e) => updateRow(setServices, i, 'capacity', e.target.value)}
                className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
              />
              <button
                type="button"
                onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))}
                className="col-span-2 text-sm text-red-600 hover:underline sm:col-span-6 sm:text-left"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule — native_booking only */}
      {f.fulfillment_type === 'native_booking' && (
        <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Weekly schedule</h3>
            <button
              type="button"
              onClick={() =>
                setSchedule((prev) => [
                  ...prev,
                  { day_of_week: 1, start_time: '10:00', end_time: '19:00' },
                ])
              }
              className="text-sm text-foreground/70 hover:underline"
            >
              + Add
            </button>
          </div>
          {errors['schedule'] && (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">{errors['schedule']}</p>
          )}
          <div className="space-y-2">
            {schedule.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  value={r.day_of_week}
                  onChange={(e) => updateRow(setSchedule, i, 'day_of_week', Number(e.target.value))}
                  className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={r.start_time}
                  onChange={(e) => updateRow(setSchedule, i, 'start_time', e.target.value)}
                  className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
                />
                <input
                  type="time"
                  value={r.end_time}
                  onChange={(e) => updateRow(setSchedule, i, 'end_time', e.target.value)}
                  className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm dark:border-white/20"
                />
                <button
                  type="button"
                  onClick={() => setSchedule((prev) => prev.filter((_, j) => j !== i))}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-foreground px-6 font-medium text-background disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {provider && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="min-h-11 rounded-lg border border-red-500/40 px-4 text-sm text-red-600 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

function updateRow<T>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  key: keyof T,
  value: T[keyof T],
) {
  setter((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
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
    <label className="block text-sm">
      <span className="text-foreground/70">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </label>
  )
}

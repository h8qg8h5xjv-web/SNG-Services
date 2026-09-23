'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { geocodeAddress, type GeocodeHit } from '@/lib/admin/geocode-actions'

// maplibre-gl loads only inside the admin form, when this component mounts.
const AdminPickerMap = dynamic(() => import('@/components/map/AdminPickerMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-slate-100" />,
})

// Admin address block (§4): type an address, «Найти на карте» geocodes it via
// Nominatim (throttled server-side), pick a result or drag the marker. Strings
// mirror the rest of the admin UI (hard-coded Russian).
export default function AddressGeocoder({
  address,
  lat,
  lng,
  onChange,
}: {
  address: string
  lat: string
  lng: string
  onChange: (patch: { address?: string; lat?: string; lng?: string }) => void
}) {
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<GeocodeHit[]>([])
  const [msg, setMsg] = useState('')

  async function search() {
    setSearching(true)
    setMsg('')
    setHits([])
    const res = await geocodeAddress(address)
    setSearching(false)
    if (!res.ok) {
      setMsg('Не удалось найти адрес')
      return
    }
    if (res.hits.length === 0) {
      setMsg('Ничего не найдено')
      return
    }
    setHits(res.hits)
  }

  const latN = lat.trim() ? Number(lat) : null
  const lngN = lng.trim() ? Number(lng) : null

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-body text-slate-500">Адрес</span>
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="min-h-11 flex-1 rounded-control border border-slate-300 px-3 text-body"
          />
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="press focus-ring min-h-11 shrink-0 rounded-control bg-slate-900 px-4 text-body font-semibold text-white disabled:opacity-60"
          >
            {searching ? 'Ищем…' : 'Найти на карте'}
          </button>
        </div>
      </label>

      {msg && <p className="text-body text-red-700">{msg}</p>}

      {hits.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-control border border-slate-200">
          {hits.map((h, i) => (
            <li key={`${h.lat}-${h.lng}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ address: h.label, lat: String(h.lat), lng: String(h.lng) })
                  setHits([])
                }}
                className="block w-full px-3 py-2 text-left text-body hover:bg-slate-50"
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="h-72 w-full overflow-hidden rounded-control border border-slate-200">
        <AdminPickerMap
          lat={latN}
          lng={lngN}
          onMove={(la, ln) => onChange({ lat: la.toFixed(6), lng: ln.toFixed(6) })}
        />
      </div>
      <p className="text-meta text-slate-500">
        Перетащите метку или нажмите на карту, чтобы уточнить.{' '}
        {latN != null && lngN != null
          ? `${latN.toFixed(5)}, ${lngN.toFixed(5)}`
          : 'Координаты не заданы'}
      </p>
    </div>
  )
}

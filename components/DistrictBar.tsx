'use client'

import { useTranslations } from 'next-intl'
import { IconMapPin, IconCurrentLocation } from '@tabler/icons-react'
import { useDistrict, setDistrict } from '@/lib/district'

// A one-line "your area" control under the hero search (§3). Asked once; the
// choice (shared location or a picked borough) is remembered per device and used
// to sort nearby lists. Sits on the dark hero, so text is light.
export default function DistrictBar({ boroughs }: { boroughs: string[] }) {
  const t = useTranslations('district')
  const district = useDistrict()

  function detect() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setDistrict({ kind: 'geo', lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  const label = district ? (district.kind === 'geo' ? t('near') : district.name) : null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-meta text-blue-100">
      <span className="inline-flex items-center gap-1">
        <IconMapPin className="h-4 w-4" stroke={2} />
        {label ?? t('title')}
      </span>
      {district ? (
        <button
          type="button"
          onClick={() => setDistrict(null)}
          className="focus-ring font-semibold text-white underline underline-offset-2"
        >
          {t('change')}
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={detect}
            className="focus-ring inline-flex items-center gap-1 font-semibold text-white underline underline-offset-2"
          >
            <IconCurrentLocation className="h-4 w-4" stroke={2} /> {t('detect')}
          </button>
          <select
            aria-label={t('placeholder')}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) setDistrict({ kind: 'borough', name: e.target.value })
            }}
            className="focus-ring min-h-9 rounded-control border border-white/30 bg-transparent px-2 text-white"
          >
            <option value="" disabled className="text-slate-900">
              {t('placeholder')}
            </option>
            {boroughs.map((b) => (
              <option key={b} value={b} className="text-slate-900">
                {b}
              </option>
            ))}
          </select>
        </span>
      )}
    </div>
  )
}

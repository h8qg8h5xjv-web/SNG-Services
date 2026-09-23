'use client'

import { useTranslations } from 'next-intl'
import { IconMapPin, IconCurrentLocation } from '@tabler/icons-react'
import { useDistrict, setDistrict } from '@/lib/district'
import Select from '@/components/ui/Select'

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
          <Select
            value=""
            onChange={(v) => setDistrict({ kind: 'borough', name: v })}
            options={boroughs.map((b) => ({ value: b, label: b }))}
            placeholder={t('placeholder')}
            ariaLabel={t('placeholder')}
            title={t('placeholder')}
            searchable
            searchPlaceholder={t('placeholder')}
            className="w-48"
          />
        </span>
      )}
    </div>
  )
}

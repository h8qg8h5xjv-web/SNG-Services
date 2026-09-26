'use client'

import { useTranslations } from 'next-intl'
import { IconMapPin, IconCurrentLocation } from '@tabler/icons-react'
import { useDistrict, setDistrict } from '@/lib/district'
import Select from '@/components/ui/Select'

// A one-line "your area" control on the home page. Asked once; the choice
// (shared location or a picked borough) is remembered per device and used to
// sort nearby lists.
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
    <div className="district">
      <span className="inline-flex items-center gap-2">
        <IconMapPin stroke={1.75} aria-hidden="true" />
        {label ? <b className="text-ink">{label}</b> : t('title')}
      </span>
      {district ? (
        <button type="button" onClick={() => setDistrict(null)} className="link">
          {t('change')}
        </button>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={detect} className="tog">
            <IconCurrentLocation stroke={1.75} aria-hidden="true" /> {t('detect')}
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
            variant="pill"
          />
        </span>
      )}
    </div>
  )
}

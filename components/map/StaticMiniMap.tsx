'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { OSM_STYLE } from '@/lib/maps/style'
import 'maplibre-gl/dist/maplibre-gl.css'

const ACCENT = '#1e40af'

// A non-interactive map with a single marker for the «Адрес» block. All gestures
// are disabled — the surrounding link opens the full OSM map (§3).
export default function StaticMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [lng, lat],
      zoom: 14,
      interactive: false,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    new maplibregl.Marker({ color: ACCENT }).setLngLat([lng, lat]).addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  return <div ref={containerRef} className="h-full w-full" />
}

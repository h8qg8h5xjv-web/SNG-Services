'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { OSM_STYLE } from '@/lib/maps/style'
import { INK } from '@/lib/palette'
import 'maplibre-gl/dist/maplibre-gl.css'

const MARKER = INK

// A non-interactive map with a single marker for «Где и когда». All gestures
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
    // The container can settle its size after the map is created (grid cells).
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)
    new maplibregl.Marker({ color: MARKER }).setLngLat([lng, lat]).addTo(map)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  return <div ref={containerRef} className="h-full w-full" />
}

'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { OSM_STYLE } from '@/lib/maps/style'
import { LONDON_CENTER } from '@/lib/maps/distance'
import 'maplibre-gl/dist/maplibre-gl.css'

const ACCENT = '#1e40af'

// Admin map with one draggable marker. Dragging it — or clicking the map — reports
// new coordinates so the form's lat/lng stay in sync (§4).
export default function AdminPickerMap({
  lat,
  lng,
  onMove,
}: {
  lat: number | null
  lng: number | null
  onMove: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const onMoveRef = useRef(onMove)
  useEffect(() => {
    onMoveRef.current = onMove
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const hasCoords = lat != null && lng != null
    const start = hasCoords ? { lat, lng } : LONDON_CENTER
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [start.lng, start.lat],
      zoom: hasCoords ? 14 : 11,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const marker = new maplibregl.Marker({ color: ACCENT, draggable: true })
      .setLngLat([start.lng, start.lat])
      .addTo(map)
    markerRef.current = marker
    marker.on('dragend', () => {
      const ll = marker.getLngLat()
      onMoveRef.current(ll.lat, ll.lng)
    })
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat)
      onMoveRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recentre when coordinates change from outside (a geocode pick).
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker || lat == null || lng == null) return
    marker.setLngLat([lng, lat])
    map.easeTo({ center: [lng, lat], zoom: 15 })
  }, [lat, lng])

  return <div ref={containerRef} className="h-full w-full" />
}

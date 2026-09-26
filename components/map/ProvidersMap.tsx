'use client'

import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import maplibregl, { type Map as MlMap, type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { IconCurrentLocation } from '@tabler/icons-react'
import CategoryIcon from '@/components/CategoryIcon'
import type { MapPoint } from '@/lib/maps/points'
import { LONDON_CENTER } from '@/lib/maps/distance'
import { OSM_STYLE } from '@/lib/maps/style'
import { DUSK, INK, WHITE } from '@/lib/palette'
import 'maplibre-gl/dist/maplibre-gl.css'

// Colours come from the shared palette (lib/palette). MapLibre paint props and the
// SVG markers take literal hex, so they cannot use CSS tokens at runtime.
// v2: markers in ink on white; clusters as dusk discs.
const ACCENT = INK

// The OSM raster style has no glyph endpoint, so every marker — price pills,
// cluster counts, category discs — is a self-contained SVG image generated on
// demand (styleimagemissing). No external font server, no API key.

type PointProps = {
  id: string
  categorySlug: string
  // The marker image id: cat-<slug> for places, price-<label>/master-dot for masters.
  img: string
}

function imageIdFor(p: MapPoint): string {
  if (p.kind === 'place') return `cat-${p.categorySlug}`
  return p.pricePence != null ? `price-£${Math.round(p.pricePence / 100)}` : 'master-dot'
}

function toFeatureCollection(points: MapPoint[]): FeatureCollection<Point, PointProps> {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, categorySlug: p.categorySlug, img: imageIdFor(p) },
    })),
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// --- Marker images (2× for crispness; added with pixelRatio 2) ---------------

function discSvg(inner: string, size: number): string {
  const r = size / 2 - 4
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${WHITE}" stroke="${ACCENT}" stroke-width="4"/>${inner}</svg>`
}

function categorySvg(iconName: string): string {
  const size = 64
  let icon = renderToStaticMarkup(<CategoryIcon name={iconName} />)
  icon = icon.replace(/stroke="currentColor"/g, `stroke="${ACCENT}"`)
  // Centre the 24×24 icon inside the disc.
  const inner = `<g transform="translate(${size / 2 - 12}, ${size / 2 - 12})">${icon}</g>`
  return discSvg(inner, size)
}

function masterDotSvg(): string {
  const size = 40
  const inner = `<circle cx="${size / 2}" cy="${size / 2}" r="6" fill="${ACCENT}"/>`
  return discSvg(inner, size)
}

function pricePillSvg(label: string): string {
  const h = 48
  const w = Math.max(64, 40 + label.length * 22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="4" y="4" rx="${(h - 8) / 2}" width="${w - 8}" height="${h - 8}" fill="${WHITE}" stroke="${ACCENT}" stroke-width="4"/><text x="${w / 2}" y="${h / 2}" fill="${INK}" font-family="system-ui,Arial,sans-serif" font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="central">${esc(label)}</text></svg>`
}

function clusterSvg(count: string): string {
  const n = parseInt(count, 10) || 0
  const size = n >= 50 ? 68 : n >= 10 ? 56 : 48
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 5}" fill="${DUSK}" stroke="${WHITE}" stroke-width="5"/><text x="${size / 2}" y="${size / 2}" fill="${WHITE}" font-family="system-ui,Arial,sans-serif" font-size="24" font-weight="700" text-anchor="middle" dominant-baseline="central">${esc(count)}</text></svg>`
}

function svgToImage(svg: string): HTMLImageElement {
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return img
}

export type ProvidersMapProps = {
  points: MapPoint[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  onOpen?: (point: MapPoint) => void
  onBoundsChange?: (visibleIds: string[]) => void
  center?: { lat: number; lng: number } | null
  fitToPoints?: boolean
  showLocate?: boolean
  locateLabel?: string
  className?: string
}

export default function ProvidersMap({
  points,
  selectedId = null,
  onSelect,
  onOpen,
  onBoundsChange,
  center,
  fitToPoints = true,
  showLocate = false,
  locateLabel,
  className,
}: ProvidersMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MlMap | null>(null)
  const readyRef = useRef(false)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)

  // Latest values read inside stable map handlers (avoids stale closures). Refs
  // are only written in an effect — never during render.
  const pointsRef = useRef(points)
  const selectedRef = useRef(selectedId)
  const cbRef = useRef({ onSelect, onOpen, onBoundsChange })
  const iconByCat = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    pointsRef.current = points
    selectedRef.current = selectedId
    cbRef.current = { onSelect, onOpen, onBoundsChange }
    const byCat = new Map<string, string>()
    points.forEach((p) => byCat.set(p.categorySlug, p.categoryIcon ?? ''))
    iconByCat.current = byCat
  })

  function emitVisible(map: MlMap) {
    const bounds = map.getBounds()
    const ids = pointsRef.current
      .filter((p) => bounds.contains([p.lng, p.lat]))
      .map((p) => p.id)
    cbRef.current.onBoundsChange?.(ids)
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const start = center ?? LONDON_CENTER
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [start.lng, start.lat],
      zoom: 11,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('styleimagemissing', (e) => {
      const id = e.id
      if (map.hasImage(id)) return
      let svg: string | null = null
      if (id.startsWith('cat-')) svg = categorySvg(iconByCat.current.get(id.slice(4)) ?? '')
      else if (id === 'master-dot') svg = masterDotSvg()
      else if (id.startsWith('price-')) svg = pricePillSvg(id.slice(6))
      else if (id.startsWith('cluster-')) svg = clusterSvg(id.slice(8))
      if (!svg) return
      const img = svgToImage(svg)
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 })
      }
    })

    map.on('load', () => {
      map.addSource('providers', {
        type: 'geojson',
        data: toFeatureCollection(pointsRef.current),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      })

      map.addLayer({
        id: 'clusters',
        type: 'symbol',
        source: 'providers',
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': ['concat', 'cluster-', ['to-string', ['get', 'point_count']]],
          'icon-size': 0.5,
          'icon-allow-overlap': true,
        },
      })

      map.addLayer({
        id: 'points',
        type: 'symbol',
        source: 'providers',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'img'],
          'icon-size': 0.5,
          'icon-allow-overlap': true,
        },
      })

      map.on('click', 'clusters', (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        if (!feature) return
        const clusterId = feature.properties?.cluster_id as number
        const src = map.getSource('providers') as GeoJSONSource
        void src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = feature.geometry
          if (geom.type === 'Point') map.easeTo({ center: geom.coordinates as [number, number], zoom })
        })
      })

      const onPointClick = (e: { features?: MapGeoJSONFeature[] }) => {
        const id = e.features?.[0]?.properties?.id as string | undefined
        if (!id) return
        const point = pointsRef.current.find((p) => p.id === id)
        if (!point) return
        // First tap selects (parent shows a card); second tap on the same marker opens.
        if (selectedRef.current === id) cbRef.current.onOpen?.(point)
        else cbRef.current.onSelect?.(id)
      }
      map.on('click', 'points', onPointClick)
      for (const layer of ['points', 'clusters']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
      }

      map.on('moveend', () => emitVisible(map))

      readyRef.current = true
      if (fitToPoints && pointsRef.current.length > 0) fitAll(map, pointsRef.current)
      emitVisible(map)
    })

    return () => {
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('providers') as GeoJSONSource | undefined
    if (!src) return
    src.setData(toFeatureCollection(points))
    if (fitToPoints && points.length > 0) fitAll(map, points)
    emitVisible(map)
  }, [points, fitToPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !selectedId) return
    const point = points.find((p) => p.id === selectedId)
    if (point) map.easeTo({ center: [point.lng, point.lat], duration: 300 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  function locateMe() {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      map.easeTo({ center: [longitude, latitude], zoom: 13 })
      if (userMarkerRef.current) userMarkerRef.current.remove()
      userMarkerRef.current = new maplibregl.Marker({ color: ACCENT })
        .setLngLat([longitude, latitude])
        .addTo(map)
    })
  }

  return (
    <div className={`relative ${className ?? 'h-full w-full'}`}>
      <div ref={containerRef} className="h-full w-full" />
      {showLocate && (
        <button
          type="button"
          onClick={locateMe}
          aria-label={locateLabel}
          className="btn btn-line btn-sm absolute left-3 top-3 z-10"
        >
          <IconCurrentLocation className="h-5 w-5" stroke={1.75} aria-hidden="true" />
          {locateLabel}
        </button>
      )}
    </div>
  )
}

function fitAll(map: MlMap, points: MapPoint[]) {
  if (points.length === 1) {
    map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 13 })
    return
  }
  const bounds = new maplibregl.LngLatBounds()
  for (const p of points) bounds.extend([p.lng, p.lat])
  map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
}

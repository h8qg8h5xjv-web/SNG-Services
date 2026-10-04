// Draws the app icons and the social-sharing image from the lamp mark (the
// header's .logo-win: an arch window, 14×20, radius 7 7 2 2, lamp-hi → lamp)
// with the colours read from app/globals.css. Rendered by next/og (already part
// of Next); the PNGs are committed, so builds never run this.
// Run after changing the mark, the palette or the tagline: npm run brand:assets
//
// Fetches two subsetted fonts from Google Fonts (Unbounded for the wordmark,
// Onest for the tagline) — satori can't read the woff2 that next/font ships.

import fs from 'node:fs'
import path from 'node:path'
import { ImageResponse } from 'next/og.js'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand.ts'

const ROOT = path.join(import.meta.dirname, '..')

const css = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')
function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token --color-${name} not found in app/globals.css`)
  return m[1]
}
const C = {
  dusk: token('dusk'),
  dusk2: token('dusk-2'),
  lamp: token('lamp'),
  lampHi: token('lamp-hi'),
  text: token('night-text'),
  soft: token('night-soft'),
}

type Node = { type: string; props: Record<string, unknown> }
const h = (type: string, props: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: children.length === 0 ? props : { ...props, children: children.length === 1 ? children[0] : children },
})

// The arch: semicircular top, small radius at the bottom (2/14 of the width).
function lampPath(x: number, y: number, w: number, hgt: number): string {
  const r = w / 2
  const b = (w * 2) / 14
  return [
    `M${x},${y + r}`,
    `A${r},${r} 0 0 1 ${x + w},${y + r}`,
    `L${x + w},${y + hgt - b}`,
    `A${b},${b} 0 0 1 ${x + w - b},${y + hgt}`,
    `L${x + b},${y + hgt}`,
    `A${b},${b} 0 0 1 ${x},${y + hgt - b}`,
    'Z',
  ].join(' ')
}

type IconSpec = {
  size: number
  // Lamp height as a share of the canvas; width follows the 14:20 mark.
  lamp: number
  // 'full' — square to the edges (the OS applies its own mask); 'rounded' —
  // a tile with transparent corners.
  shape: 'full' | 'rounded'
  glow: boolean
}

function iconSvg({ size: s, lamp, shape, glow }: IconSpec): string {
  const lh = Math.round(s * lamp)
  const lw = Math.round((lh * 14) / 20)
  const x = (s - lw) / 2
  // Optically centred: the round top reads lighter, so nudge up slightly.
  const y = Math.round((s - lh) / 2 - s * 0.01)
  const radius = shape === 'rounded' ? s * 0.22 : 0
  const cx = s / 2
  const cy = y + lh / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.dusk2}"/><stop offset="1" stop-color="${C.dusk}"/>
    </linearGradient>
    <linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.lampHi}"/><stop offset="1" stop-color="${C.lamp}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx}" cy="${cy}" r="${lh * 0.95}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.lamp}" stop-opacity=".42"/>
      <stop offset=".45" stop-color="${C.lamp}" stop-opacity=".12"/>
      <stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${radius}" fill="url(#bg)"/>
  ${glow ? `<circle cx="${cx}" cy="${cy}" r="${lh * 0.95}" fill="url(#glow)"/>` : ''}
  <path d="${lampPath(x, y, lw, lh)}" fill="url(#lamp)"/>
</svg>`
}

const svgImg = (svg: string, w: number, hgt: number): Node =>
  h('img', { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width: w, height: hgt })

async function png(node: Node, width: number, height: number, fonts?: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']): Promise<Buffer> {
  const res = new ImageResponse(node as never, { width, height, fonts })
  return Buffer.from(await res.arrayBuffer())
}

const iconPng = (spec: IconSpec) => png(svgImg(iconSvg(spec), spec.size, spec.size), spec.size, spec.size)

// favicon.ico holding PNG entries (supported by every current browser).
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`
  const sheet = await (await fetch(url)).text()
  const src = sheet.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
  if (!src) throw new Error(`no TTF for ${family} ${weight}`)
  return (await fetch(src)).arrayBuffer()
}

// Small sizes: bigger lamp, no glow (it would only muddy 16 px).
const favicon = (size: number): IconSpec => ({ size, lamp: 0.72, shape: 'rounded', glow: false })
// Installed-app icons ('any'): a rounded tile.
const appIcon = (size: number): IconSpec => ({ size, lamp: 0.46, shape: 'rounded', glow: true })

const out: [string, Buffer][] = []
out.push(['public/icons/favicon-16.png', await iconPng(favicon(16))])
out.push(['public/icons/favicon-32.png', await iconPng(favicon(32))])
out.push([
  'app/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await iconPng(favicon(size)) })))),
])
// iOS rounds the corners itself and shows transparency as black: full square.
out.push(['public/icons/apple-touch-icon.png', await iconPng({ size: 180, lamp: 0.46, shape: 'full', glow: true })])
out.push(['public/icons/icon-192.png', await iconPng(appIcon(192))])
out.push(['public/icons/icon-512.png', await iconPng(appIcon(512))])
// Maskable: full bleed, and the lamp with its glow stays inside the safe zone —
// the central circle of radius 40% (w3.org/TR/appmanifest/#icon-masks).
out.push(['public/icons/icon-maskable-512.png', await iconPng({ size: 512, lamp: 0.36, shape: 'full', glow: true })])

// Social-sharing card, 1200×630: lamp + wordmark like the header, tagline below.
const tagline = BRAND_TAGLINE.ru
const W = 1200
const H = 630
const markH = 132
const markW = Math.round((markH * 14) / 20)
// Square canvas for the round glow; the lamp sits in its centre.
const G = markH * 3
const padX = (G - markW) / 2
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${G}" viewBox="0 0 ${G} ${G}">
  <defs>
    <linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.lampHi}"/><stop offset="1" stop-color="${C.lamp}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${C.lamp}" stop-opacity=".45"/>
      <stop offset=".4" stop-color="${C.lamp}" stop-opacity=".14"/>
      <stop offset="1" stop-color="${C.lamp}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${G / 2}" cy="${G / 2}" r="${G / 2}" fill="url(#glow)"/>
  <path d="${lampPath(padX, markH, markW, markH)}" fill="url(#lamp)"/>
</svg>`
const og = h(
  'div',
  {
    style: {
      width: W,
      height: H,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 112px',
      backgroundImage: `linear-gradient(180deg, ${C.dusk2}, ${C.dusk})`,
    },
  },
  h(
    'div',
    { style: { display: 'flex', alignItems: 'center' } },
    // The glow canvas is bigger than the lamp; negative margins keep the lamp itself on the grid.
    h('div', { style: { display: 'flex', margin: `-${markH}px -${padX}px -${markH}px -${padX}px` } }, svgImg(markSvg, G, G)),
    h(
      'div',
      {
        style: {
          marginLeft: 44,
          fontFamily: 'Unbounded',
          fontWeight: 600,
          fontSize: 168,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: C.text,
        },
      },
      BRAND_NAME,
    ),
  ),
  h('div', { style: { marginTop: 44, fontFamily: 'Onest', fontWeight: 500, fontSize: 56, color: C.soft } }, tagline),
)
out.push([
  'public/og/okno.png',
  await png(og, W, H, [
    { name: 'Unbounded', data: await googleFont('Unbounded', 600, BRAND_NAME), weight: 600, style: 'normal' },
    { name: 'Onest', data: await googleFont('Onest', 500, tagline), weight: 500, style: 'normal' },
  ]),
])

for (const [rel, data] of out) {
  const file = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, data)
  console.log(`${rel}  ${data.length} B`)
}

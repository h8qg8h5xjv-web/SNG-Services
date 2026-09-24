// Static skyline (DEMO_MAP §7.10): the city's fallback when WebGL is missing, and
// its stand-in while the 3D scene loads. Deterministic (mulberry32, seed 7).
// Amber arched windows stand for real free slots, so at most `lit` of them are
// drawn; `lit={0}` gives an atmosphere-only skyline for inner-page headers.
function mulberry(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Skyline({ lit }: { lit: number }) {
  const r = mulberry(7)
  const buildings: { x: number; y: number; w: number; h: number }[] = []
  const windows: { x: number; y: number; kind: 0 | 1 | 2 }[] = []
  let x = 0
  let on = 0
  while (x < 1400) {
    const w = Math.round(40 + r() * 70)
    const h = Math.round(120 + r() * 260)
    buildings.push({ x, y: 500 - h, w, h })
    for (let yy = 500 - h + 16; yy < 480; yy += 26) {
      for (let xx = x + 10; xx < x + w - 14; xx += 20) {
        const amber = r() < 0.09 && on < lit
        if (amber) on++
        windows.push({ x: xx, y: yy, kind: amber ? 2 : r() < 0.1 ? 1 : 0 })
      }
    }
    x += w + 4
  }
  const fill = ['#121B35', '#565E80', '#FFB547']
  return (
    <svg viewBox="0 0 1400 500" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
      {buildings.map((b, i) => (
        <rect key={`b${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="#18223F" />
      ))}
      {windows.map((w, i) => (
        <rect key={`w${i}`} x={w.x} y={w.y} width="9" height="13" rx={w.kind === 2 ? 4 : 1} fill={fill[w.kind]} />
      ))}
    </svg>
  )
}

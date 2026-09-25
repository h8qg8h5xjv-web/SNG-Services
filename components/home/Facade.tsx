'use client'

import { useEffect, useRef } from 'react'

const LIT = new Set([13, 27, 34, 48, 56, 71])

// Business facade (DEMO_MAP §3.1): 80 arched panes; the pointer lights any pane
// within 12% of the facade width for 500ms, then it fades back over 1.4s.
export default function Facade() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const panes = Array.from(el.children) as HTMLElement[]
    const timers = new Map<HTMLElement, number>()
    let raf = 0
    const light = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect()
        const reach = box.width * 0.12
        for (const p of panes) {
          const r = p.getBoundingClientRect()
          if (Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY) > reach) continue
          p.classList.add('on')
          window.clearTimeout(timers.get(p))
          timers.set(p, window.setTimeout(() => p.classList.remove('on'), 500))
        }
      })
    }
    el.addEventListener('pointermove', light)
    el.addEventListener('pointerdown', light)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((t) => window.clearTimeout(t))
      el.removeEventListener('pointermove', light)
      el.removeEventListener('pointerdown', light)
    }
  }, [])

  return (
    <div ref={ref} className="facade" aria-hidden="true">
      {Array.from({ length: 80 }, (_, i) => (
        <i key={i} className={LIT.has(i) ? 'lit' : undefined} />
      ))}
    </div>
  )
}

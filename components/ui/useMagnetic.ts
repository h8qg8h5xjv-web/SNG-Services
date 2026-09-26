'use client'

import { useCallback, useRef } from 'react'

// Magnetic pull for the primary CTA (DEMO_MAP §6.4): the button follows a fine
// pointer by up to 6px × 4px and springs back on leave. Off for touch and
// reduced motion. Returns a ref callback; pair it with className="magnetic".
export function useMagnetic<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null)
  return useCallback((el: T | null) => {
    cleanup.current?.()
    cleanup.current = null
    if (!el) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
        const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
        el.classList.add('is-pulling')
        el.style.translate = `${(x * 6).toFixed(1)}px ${(y * 4).toFixed(1)}px`
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.classList.remove('is-pulling')
      el.style.translate = ''
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    cleanup.current = () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])
}

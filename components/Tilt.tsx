'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// CSS-only 3D tilt (DESIGN-SYSTEM §Motion, task §4). The rotation angle is derived
// from the pointer position inside the element and written straight to
// el.style.transform inside a single requestAnimationFrame — one write per frame,
// no work between frames, so moving the mouse never floods the main thread.
//
// Eligibility (real hover + fine pointer, motion not reduced) is checked once into
// a ref; the handlers stay attached but no-op otherwise. The CSS that gives depth
// (perspective, preserve-3d, transition, layer/cover transforms) lives entirely
// behind the same media query, so touch and reduced-motion get a plain card.
// Depth is transform-only — no shadows.
export default function Tilt({
  maxDeg,
  translateZ = 0,
  perspective = 'near',
  className = '',
  children,
}: {
  maxDeg: number
  translateZ?: number
  perspective?: 'near' | 'far'
  className?: string
  children: ReactNode
}) {
  const inner = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const enabled = useRef(false)

  useEffect(() => {
    enabled.current =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => cancelAnimationFrame(frame.current)
  }, [])

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = inner.current
    if (!enabled.current || !el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    const ry = px * 2 * maxDeg
    const rx = -py * 2 * maxDeg
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${translateZ}px)`
    })
  }

  function onLeave() {
    const el = inner.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.style.transform = ''
  }

  return (
    <div
      className={perspective === 'far' ? 'tilt-scene-far h-full' : 'tilt-scene h-full'}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div ref={inner} className={`tilt h-full ${className}`}>
        {children}
      </div>
    </div>
  )
}

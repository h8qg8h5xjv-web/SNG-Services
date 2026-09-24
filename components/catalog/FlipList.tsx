'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

// A list that animates reordering (DEMO_MAP §6.4 FLIP): items keep their
// position across re-renders and glide 220ms to the new one; new items fade
// in. Children must carry data-key. Reduced motion: plain re-render.
export default function FlipList({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement | null>(null)
  const last = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const ul = ref.current
    if (!ul) return
    const items = Array.from(ul.children) as HTMLElement[]
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, DOMRect>()
    for (const el of items) {
      const key = el.dataset.key
      if (!key) continue
      const rect = el.getBoundingClientRect()
      next.set(key, rect)
      if (reduce || last.current.size === 0) continue
      const before = last.current.get(key)
      if (!before) {
        el.classList.remove('flip-in')
        void el.offsetWidth
        el.classList.add('flip-in')
        continue
      }
      const dx = before.left - rect.left
      const dy = before.top - rect.top
      if (!dx && !dy) continue
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 220,
        easing: 'cubic-bezier(.23,1,.32,1)',
      })
    }
    last.current = next
  })

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  )
}

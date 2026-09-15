'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Scroll-reveal wrapper (task §5): the element rises 12px and fades in once when it
// enters the viewport, then the observer disconnects — it never re-animates. The
// hidden start state lives in CSS behind a (hover:hover) + no-reduced-motion media
// query, so on mobile, touch, or reduced-motion the content is simply visible and
// this observer is a harmless no-op.
export default function Reveal({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            io.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}

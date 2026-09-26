'use client'

import type { ReactNode } from 'react'

// «Хочу в каталог»: a plain #apply anchor that, with JS, scrolls smoothly and
// then puts the caret in the first field (DEMO_MAP §3.12).
export default function ApplyLink({ className, children }: { className?: string; children: ReactNode }) {
  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById('apply')
    if (!target) return
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', '#apply')
    window.setTimeout(() => document.getElementById('cr-contact')?.focus({ preventScroll: true }), reduce ? 0 : 500)
  }
  return (
    <a href="#apply" className={className} onClick={onClick}>
      {children}
    </a>
  )
}

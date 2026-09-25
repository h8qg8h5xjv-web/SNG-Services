'use client'

import { useEffect, useState, type ReactNode } from 'react'

export type LegalSection = { id: string; title: string; body: string }

// Legal page body (DEMO_MAP §3.14): a sticky table of contents beside the
// prose. A TOC link scrolls to its heading and moves focus there; the heading
// in view is marked current.
export default function LegalDoc({
  sections,
  tocLabel,
  intro,
  outro,
}: {
  sections: LegalSection[]
  tocLabel: string
  intro?: ReactNode
  outro?: ReactNode
}) {
  const [current, setCurrent] = useState(sections[0]?.id)

  useEffect(() => {
    const heads = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null)
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setCurrent(top.target.id)
      },
      { rootMargin: '-20% 0px -60% 0px' },
    )
    heads.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [sections])

  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
    history.replaceState(null, '', `#${id}`)
    setCurrent(id)
  }

  return (
    <div className="legal">
      <nav className="toc" aria-label={tocLabel}>
        <ol>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={current === s.id ? 'true' : undefined} onClick={(e) => go(e, s.id)}>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="prose">
        {intro}
        {sections.map((s) => (
          <section key={s.id}>
            <h2 id={s.id} tabIndex={-1}>
              {s.title}
            </h2>
            <p>{s.body}</p>
          </section>
        ))}
        {outro}
      </article>
    </div>
  )
}

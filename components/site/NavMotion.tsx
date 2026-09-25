'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/i18n/navigation'

// Tags each navigation with its kind on <html data-vt> so transitions.css can
// pick the animation (DEMO_MAP §6.3), and moves focus to the new page's h1.
//   push       a clicked link — its rect becomes the origin of the arch reveal
//   pop        back/forward (and keyboard-activated links, which have no rect)
//   step(-back) links marked data-kind="step" / "step-back" (flows, tabs)
//   none       the RU/EN switch: no transition, focus stays
function kindOf(a: HTMLAnchorElement, e: MouseEvent): string {
  if (a.hasAttribute('data-lang')) return 'none'
  const explicit = a.dataset.kind
  if (explicit) return explicit
  return e.detail === 0 ? 'pop' : 'push'
}

function setArchOrigin(el: Element) {
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const top = Math.min(Math.max(0, r.top), vh)
  const left = Math.min(Math.max(0, r.left), vw)
  const right = Math.min(Math.max(0, vw - r.right), vw)
  const bottom = Math.min(Math.max(0, vh - r.bottom), vh)
  const w = Math.max(0, vw - left - right)
  const h = Math.max(0, vh - top - bottom)
  const s = document.documentElement.style
  s.setProperty('--vt-t', `${top}px`)
  s.setProperty('--vt-r', `${right}px`)
  s.setProperty('--vt-b', `${bottom}px`)
  s.setProperty('--vt-l', `${left}px`)
  s.setProperty('--vt-R', `${Math.min(w, 2 * h) / 2}px`)
}

export default function NavMotion() {
  const pathname = usePathname()
  const locale = useLocale()
  const here = `${locale}${pathname}`
  const last = useRef(here)

  useEffect(() => {
    const root = document.documentElement
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]')
      if (!(a instanceof HTMLAnchorElement)) return
      if (a.target && a.target !== '_self') return
      if (a.origin !== location.origin || a.hasAttribute('download')) return
      if (a.pathname === location.pathname && a.search === location.search) return
      const kind = kindOf(a, e)
      root.dataset.vt = kind
      if (kind === 'push') setArchOrigin(a)
    }
    const onPop = () => {
      root.dataset.vt = 'pop'
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  useEffect(() => {
    // Only real navigations: not the first load (nor StrictMode's re-run of it).
    if (last.current === here) return
    last.current = here
    const root = document.documentElement
    const kind = root.dataset.vt
    // The page may stream in after a loading skeleton: wait for its h1, and only
    // take focus if the user hasn't moved it somewhere else meanwhile.
    const from = document.activeElement
    let raf = 0
    const until = performance.now() + 2000
    const focusHeading = () => {
      const h1 = document.querySelector<HTMLElement>('#main h1')
      const untouched = document.activeElement === from || document.activeElement === document.body
      if (h1 && untouched) {
        h1.setAttribute('tabindex', '-1')
        h1.focus({ preventScroll: true })
      } else if (!h1 && untouched && performance.now() < until) {
        raf = requestAnimationFrame(focusHeading)
      }
    }
    if (kind !== 'none') raf = requestAnimationFrame(focusHeading)
    // Clear once this navigation's transition has had time to run.
    const t = window.setTimeout(() => {
      delete root.dataset.vt
    }, 400)
    return () => {
      window.clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [here])

  return null
}

// For programmatic navigations that belong to a flow (booking steps): tag the
// next transition so it slides instead of fading.
export function setNavKind(kind: 'step' | 'step-back' | 'pop') {
  document.documentElement.dataset.vt = kind
}

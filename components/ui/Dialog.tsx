'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { IconX } from '@tabler/icons-react'

const PHONE = '(max-width: 720px)'
const REDUCED = '(prefers-reduced-motion: reduce)'

// Animated close: the card drops 150ms, the sheet slides away 190ms.
function animateClose(dlg: HTMLDialogElement, closing: { current: boolean }) {
  if (window.matchMedia(REDUCED).matches) {
    dlg.close()
    return
  }
  closing.current = true
  dlg.classList.add('closing')
  const ms = window.matchMedia(PHONE).matches ? 190 : 150
  window.setTimeout(() => {
    dlg.classList.remove('closing')
    dlg.close()
    closing.current = false
  }, ms)
}

// v2 dialog (DEMO_MAP §4, §6): native <dialog> (focus trap, Esc). Desktop: card
// that pops from 0.96 on --spring. Phones: bottom sheet that settles on
// --spring-soft and can be dragged down to dismiss. Exits are faster than
// entrances (160ms card, 200ms sheet).
export function Dialog({
  open,
  onClose,
  labelledBy,
  label,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  labelledBy?: string
  label?: string
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('common')
  const ref = useRef<HTMLDialogElement | null>(null)
  const closing = useRef(false)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) {
      closing.current = false
      dlg.classList.remove('closing', 'dragout')
      dlg.style.transform = ''
      dlg.style.transition = ''
      dlg.showModal()
    } else if (!open && dlg.open && !closing.current) {
      animateClose(dlg, closing)
    }
  }, [open])

  // Velocity-aware drag to dismiss on the sheet grabber (DEMO_MAP §6.4).
  function onGrabDown(e: React.PointerEvent<HTMLDivElement>) {
    const dlg = ref.current
    if (!dlg || !window.matchMedia(PHONE).matches) return
    const startY = e.clientY
    let lastY = startY
    let lastT = performance.now()
    let v = 0
    e.currentTarget.setPointerCapture(e.pointerId)
    dlg.style.transition = 'none'
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      const now = performance.now()
      v = (ev.clientY - lastY) / Math.max(1, now - lastT)
      lastY = ev.clientY
      lastT = now
      dlg.style.transform = `translateY(${dy > 0 ? dy : dy * 0.2}px)`
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const dy = ev.clientY - startY
      if (dy > 110 || (dy > 20 && v > 0.11)) {
        closing.current = true
        dlg.classList.add('dragout')
        dlg.style.transition = 'transform .24s cubic-bezier(.32,.72,0,1)'
        dlg.style.transform = 'translateY(100%)'
        let done = false
        const finish = () => {
          if (done) return
          done = true
          dlg.close()
          dlg.classList.remove('dragout')
          dlg.style.transform = ''
          dlg.style.transition = ''
          closing.current = false
          onClose()
        }
        dlg.addEventListener('transitionend', finish, { once: true })
        window.setTimeout(finish, 300)
      } else {
        dlg.style.transition = 'transform .4s var(--spring-soft)'
        dlg.style.transform = ''
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <dialog
      ref={ref}
      className={`dlg ${className}`}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="grab" aria-hidden="true" onPointerDown={onGrabDown} />
      <button type="button" className="x-btn" aria-label={t('close')} onClick={onClose}>
        <IconX stroke={2} />
      </button>
      <div className="dlg-body">{children}</div>
    </dialog>
  )
}

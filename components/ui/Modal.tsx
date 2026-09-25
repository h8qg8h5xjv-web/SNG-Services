'use client'

import type { ReactNode } from 'react'
import { Dialog } from './Dialog'

// Kept for existing callers: a v2 Dialog (sheet on phones, card on desktop).
export function Modal({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onClose={onClose} label={label}>
      {children}
    </Dialog>
  )
}

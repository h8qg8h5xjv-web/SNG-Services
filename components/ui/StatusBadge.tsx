import type { ReactNode } from 'react'

// v2 status (DEMO_MAP §4 «Request card»): a dot plus a label. Colour is never
// the only signal — the label always carries the meaning.
type Tone = 'success' | 'neutral' | 'error'

const TONE: Record<Tone, string> = {
  success: 'status taken',
  neutral: 'status',
  error: 'status error',
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={TONE[tone]}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}

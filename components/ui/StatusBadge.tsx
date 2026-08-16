import type { ReactNode } from 'react'

// DESIGN-SYSTEM §5: status badge — rounded-full, 13px, green or slate. Colour is
// never the only signal (§8): the label text always carries the meaning too.
type Tone = 'success' | 'neutral' | 'error'

const TONE: Record<Tone, string> = {
  success: 'bg-green-100 text-green-700',
  neutral: 'bg-slate-100 text-slate-500',
  error: 'bg-red-100 text-red-700',
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-meta ${TONE[tone]}`}>
      {children}
    </span>
  )
}

import type { ReactNode } from 'react'
import { Skyline } from '@/components/city/Skyline'

// Inner-page night header (DEMO_MAP §4 «Night header»): a still skyline under a
// shade, then the page's crumbs, title and controls. No amber windows here —
// amber means a real free slot, and this skyline is atmosphere only.
export default function NightHeader({ children }: { children: ReactNode }) {
  return (
    <header className="nhead night">
      <div className="snap" aria-hidden="true">
        <Skyline lit={0} />
      </div>
      <div className="wrap">{children}</div>
    </header>
  )
}

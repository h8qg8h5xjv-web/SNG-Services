import type { ReactNode } from 'react'

// The core motif (DESIGN.md «окно»): an arched window. Lit = a free slot;
// `off` = booked / dark, the time shown in lamp colour. Size comes from the
// context class (slot card, time button, done screen…).
export function Pane({
  time,
  off = false,
  thin = false,
  className = '',
}: {
  time?: ReactNode
  off?: boolean
  thin?: boolean
  className?: string
}) {
  return (
    <span className={`pane ${off ? 'off' : ''} ${thin ? 'thin' : ''} ${className}`} aria-hidden={time ? undefined : true}>
      <span className="glow" aria-hidden="true" />
      {time !== undefined && time !== null && <span className="time">{time}</span>}
    </span>
  )
}

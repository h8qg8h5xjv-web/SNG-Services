import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { Pane } from './Pane'

// v2 confirmation (DEMO_MAP §3.3 `.bk-done`, compact): a window that has gone
// dark — the slot is now yours — a heading, a line, details and the next step.
export function SuccessScreen({
  title,
  message,
  details,
  action,
  time,
}: {
  title: ReactNode
  message?: ReactNode
  details?: { icon: Icon; text: ReactNode }[]
  action?: ReactNode
  time?: string
}) {
  return (
    <div className="done-card">
      <Pane off time={time ?? '✓'} />
      <h2 className="h3">{title}</h2>
      {message && <p className="muted">{message}</p>}
      {details && details.length > 0 && (
        <ul className="done-list">
          {details.map((d, i) => (
            <li key={i}>
              <d.icon stroke={1.75} aria-hidden="true" />
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
      )}
      {action && <div className="acts">{action}</div>}
    </div>
  )
}

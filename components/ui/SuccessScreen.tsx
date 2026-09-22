import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { IconCircleCheck } from '@tabler/icons-react'

// Success screen (DESIGN §8): green check, an 800 title, a line, an optional
// icon-led detail list, and an action (usually the dark "Мои записи" pill).
export function SuccessScreen({
  title,
  message,
  details,
  action,
}: {
  title: ReactNode
  message?: ReactNode
  details?: { icon: Icon; text: ReactNode }[]
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
        <IconCircleCheck className="h-8 w-8" stroke={2} />
      </span>
      <h2 className="text-title font-extrabold tracking-tight">{title}</h2>
      {message && <p className="text-body text-slate-500">{message}</p>}
      {details && details.length > 0 && (
        <ul className="w-full max-w-sm space-y-2 text-left">
          {details.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-body">
              <d.icon className="h-5 w-5 shrink-0 text-slate-500" stroke={1.5} />
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
      )}
      {action}
    </div>
  )
}

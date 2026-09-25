import type { ReactNode } from 'react'

// v2 fields (DEMO_MAP §4 «Form field»): 52px, 12px radius, ink focus ring;
// 16px text on phones so iOS doesn't zoom.
export function Input({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />
}

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} {...rest} />
}

// Label + control + hint + error, wired for screen readers. `id` is the
// control's id; the hint and error get derived ids for aria-describedby.
export function Field({
  id,
  label,
  hint,
  error,
  className = '',
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`field ${error ? 'err' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="msg-err" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

// aria-describedby for a control inside <Field>.
export function describedBy(id: string, hint?: unknown, error?: unknown): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

// The design-system dropdown is components/ui/Select.tsx (a custom listbox, not a
// native <select>). This file keeps only the text inputs.

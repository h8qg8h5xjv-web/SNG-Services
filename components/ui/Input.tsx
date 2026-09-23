// DESIGN-SYSTEM §1: inputs — 10px radius (no pills), slate-200 border, 44px tall.
// `.field` gives the accent focus border + soft accent ring (§Отклик).
export function Input({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`field min-h-11 rounded-control border border-slate-200 bg-white px-3 text-body ${className}`}
      {...rest}
    />
  )
}

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`field rounded-control border border-slate-200 bg-white p-3 text-body ${className}`}
      {...rest}
    />
  )
}

// The design-system dropdown is components/ui/Select.tsx (a custom listbox, not a
// native <select>). This file keeps only the text inputs.

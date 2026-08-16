// DESIGN-SYSTEM §5: input — slate-200 border, 15px text, 44px tall.
export function Input({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-body ${className}`}
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
      className={`w-full rounded-lg border border-slate-200 bg-white p-3 text-body ${className}`}
      {...rest}
    />
  )
}

export function Select({
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-body ${className}`}
      {...rest}
    />
  )
}

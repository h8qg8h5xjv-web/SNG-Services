'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconChevronDown, IconCheck, IconSearch } from '@tabler/icons-react'

export type SelectOption = { value: string; label: string; disabled?: boolean }

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  title?: string
  // Force the in-panel search. Auto-on when there are more than 8 options.
  searchable?: boolean
  searchPlaceholder?: string
  className?: string
  id?: string
  disabled?: boolean
  // pill = toolbar filter (42px, round); field = form control (52px, 12px radius).
  variant?: 'pill' | 'field'
  // A filter with a non-default value gets an ink border (.sel.on).
  active?: boolean
  invalid?: boolean
  describedBy?: string
}

// Type-ahead timing lives at module scope so the component render stays pure.
function pushTypeahead(state: { buf: string; at: number }, key: string): string {
  const now = Date.now()
  state.buf = now - state.at > 700 ? key : state.buf + key
  state.at = now
  return state.buf.toLowerCase()
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 721px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isDesktop
}

// v2 dropdown (DEMO_MAP §4 «Select»). Trigger is a pill (toolbars) or a field
// (forms); desktop opens an anchored panel, phones a bottom sheet. Search
// appears when there are >8 options. Full keyboard + listbox aria.
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  title,
  searchable,
  searchPlaceholder,
  className = '',
  id,
  disabled = false,
  variant = 'field',
  active: isOn = false,
  invalid = false,
  describedBy,
}: SelectProps) {
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const typeahead = useRef<{ buf: string; at: number }>({ buf: '', at: 0 })

  const listId = useId()
  const withSearch = searchable ?? options.length > 8
  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!withSearch || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, withSearch])

  function openPanel() {
    setQuery('')
    const i = options.findIndex((o) => o.value === value)
    setActive(i >= 0 ? i : 0)
    setOpen(true)
  }

  // Move focus into the panel once it is open (no state changes here).
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      if (withSearch) searchRef.current?.focus()
      else listRef.current?.focus()
    }, 20)
    return () => clearTimeout(t)
  }, [open, withSearch])

  // Keep the active option in view.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function choose(opt: SelectOption | undefined) {
    if (!opt || opt.disabled) return
    onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function moveActive(delta: number) {
    setActive((cur) => {
      const n = filtered.length
      if (n === 0) return 0
      let i = cur
      for (let step = 0; step < n; step++) {
        i = (i + delta + n) % n
        if (!filtered[i]?.disabled) return i
      }
      return cur
    })
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(filtered.length - 1)
    } else if (!withSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Type-ahead jump (no search field): letter jumps to a matching option.
      const buf = pushTypeahead(typeahead.current, e.key)
      const i = filtered.findIndex((o) => o.label.toLowerCase().startsWith(buf))
      if (i >= 0) setActive(i)
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPanel()
    }
  }

  const triggerLabel = selected ? selected.label : (placeholder ?? '')
  const activeId = open && filtered[active] ? `${listId}-opt-${active}` : undefined

  const list = (
    <ul
      ref={listRef}
      role="listbox"
      id={listId}
      tabIndex={-1}
      aria-activedescendant={activeId}
      aria-label={ariaLabel ?? title}
      onKeyDown={onListKeyDown}
      className="sel-list"
    >
      {filtered.length === 0 ? (
        <li className="sel-empty">—</li>
      ) : (
        filtered.map((o, i) => {
          const isSel = o.value === value
          const isActive = i === active
          return (
            <li
              key={o.value}
              id={`${listId}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSel}
              aria-disabled={o.disabled || undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              data-active={isActive || undefined}
              className="sel-opt"
            >
              <span className="truncate">{o.label}</span>
              {isSel && <IconCheck stroke={2} aria-hidden="true" />}
            </li>
          )
        })
      )}
    </ul>
  )

  const search = withSearch ? (
    <div className="sel-search">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-mute" stroke={2} aria-hidden="true" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onListKeyDown}
          placeholder={searchPlaceholder ?? ''}
          aria-label={searchPlaceholder ?? ariaLabel ?? title}
          className="input pl-9"
        />
      </div>
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`sel ${variant === 'field' ? 'fld' : ''} ${isOn ? 'on' : ''} ${className}`}
      data-invalid={invalid || undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className="sel-trigger"
      >
        <span className={`truncate ${selected ? '' : 'ph'}`}>{triggerLabel}</span>
        <IconChevronDown stroke={2} aria-hidden="true" />
      </button>

      {open && isDesktop && (
        <div className="sel-panel">
          {search}
          {list}
        </div>
      )}

      {open && !isDesktop && (
        <div
          role="presentation"
          className="sel-sheet-backdrop"
          onClick={() => setOpen(false)}
        >
          <div className="sel-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab-static" aria-hidden="true" />
            {(title ?? ariaLabel) && <p className="sheet-title">{title ?? ariaLabel}</p>}
            {search}
            {list}
          </div>
        </div>
      )}
    </div>
  )
}

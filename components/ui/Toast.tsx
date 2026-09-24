'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// v2 toasts (DEMO_MAP §4, §6.4): short message with an optional action, max 3,
// 4.2s life, hover pauses, leaving restarts at 2s; exit is a 160ms drop.
// Call toast() from any client component; <Toaster/> lives in the layout.
type ToastItem = {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(message: string, action?: ToastItem['action']): void {
  items = [...items, { id: nextId++, message, action }].slice(-3)
  emit()
}

function remove(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function ToastView({ item }: { item: ToastItem }) {
  const [out, setOut] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const schedule = (ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOut(true), ms)
  }

  useEffect(() => {
    schedule(4200)
    return () => window.clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    if (!out) return
    const t = window.setTimeout(() => remove(item.id), 200)
    return () => window.clearTimeout(t)
  }, [out, item.id])

  return (
    <div
      className={`toast ${out ? 'out' : ''}`}
      onMouseEnter={() => window.clearTimeout(timer.current)}
      onMouseLeave={() => schedule(2000)}
    >
      <span>{item.message}</span>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick()
            setOut(true)
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  )
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <ToastView key={t.id} item={t} />
      ))}
    </div>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import { subscribeSaved, getSavedSnapshot, getSavedServerSnapshot } from './store'

// Reactive list of saved provider slugs (client-only; empty during SSR).
export function useSaved(): readonly string[] {
  return useSyncExternalStore(subscribeSaved, getSavedSnapshot, getSavedServerSnapshot)
}

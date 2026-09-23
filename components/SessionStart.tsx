'use client'

import { useEffect } from 'react'
import { initSessionStart } from '@/lib/tracking/first-value'

// Stamps the first visit of the tab session, so time-to-first-value is measured
// from site open (§ metric #1). Renders nothing.
export default function SessionStart() {
  useEffect(() => {
    initSessionStart()
  }, [])
  return null
}

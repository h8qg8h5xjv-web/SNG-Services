'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { linkBrowserData } from '@/lib/cabinet/actions'
import { getSavedRequests, mergeRequests } from '@/lib/requests/local-store'
import { getSavedSnapshot, setSaved } from '@/lib/saved/store'

// §ONE-CABINET: on sign-in, browser data (saved + requests) is attached to the
// account automatically — no buttons. Pushes this device's data up, then adopts
// the merged set (so data from other devices appears here too). Runs once.
export default function AutoLink() {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    ;(async () => {
      const res = await linkBrowserData({
        saved: [...getSavedSnapshot()],
        requests: getSavedRequests(),
      })
      if (res.ok) {
        setSaved(res.data.saved)
        mergeRequests(res.data.requests)
        router.refresh()
      }
    })()
  }, [router])

  return null
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconX, IconDownload, IconShare2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'

// Chrome fires this before showing its own install UI; we defer it and drive our
// own gentle prompt (idea #2). Minimal shape — the platform type isn't in lib.dom.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

const DISMISS_KEY = 'sng_pwa_dismissed_at'
const DISMISS_DAYS = 30
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000

// Dismissal lasts 30 days, not forever — the hint returns later (§3).
function dismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS
  } catch {
    return false
  }
}

// Registers the service worker and shows a one-time, dismissable install hint on
// mobile: a real "Install" button where the browser supports it (Android/Chrome),
// or the Share → Add to Home Screen steps on iOS. No offline cache, no push.
export default function InstallPrompt() {
  const t = useTranslations('pwa')
  const [mode, setMode] = useState<'install' | 'ios' | null>(null)
  const deferred = useRef<InstallEvent | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (standalone || !isMobile || dismissed()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferred.current = e as InstallEvent
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)

    // Delay so the hint is unobtrusive and appears after the page settles.
    const timer = window.setTimeout(() => {
      if (dismissed()) return
      if (deferred.current) setMode('install')
      else if (isIOS && isSafari) setMode('ios')
    }, 2500)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.clearTimeout(timer)
    }
  }, [])

  function close() {
    setMode(null)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // private mode — the banner simply reappears next session
    }
  }

  async function install() {
    const event = deferred.current
    if (!event) return
    await event.prompt()
    await event.userChoice.catch(() => {})
    deferred.current = null
    close()
  }

  if (!mode) return null

  return (
    <div className="floating-bottom fixed inset-x-3 bottom-24 z-30 rounded-lg border border-slate-200 bg-white p-4 shadow-lg sm:mx-auto sm:max-w-md">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <IconDownload className="h-6 w-6" stroke={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{t('installTitle')}</p>
          {mode === 'install' ? (
            <p className="mt-0.5 text-meta text-slate-500">{t('installBody')}</p>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-meta text-slate-500">
              {t('iosBefore')}
              <IconShare2 className="inline h-4 w-4" stroke={1.5} />
              {t('iosAfter')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t('close')}
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-900"
        >
          <IconX className="h-5 w-5" stroke={1.5} />
        </button>
      </div>
      {mode === 'install' && (
        <div className="mt-3">
          <Button onClick={install} className="w-full">
            {t('installButton')}
          </Button>
        </div>
      )}
    </div>
  )
}

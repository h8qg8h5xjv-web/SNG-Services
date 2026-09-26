'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { IconChevronLeft, IconChevronRight, IconPhone } from '@tabler/icons-react'
import { Link, useRouter } from '@/i18n/navigation'
import { Pane } from '@/components/ui/Pane'
import { useMagnetic } from '@/components/ui/useMagnetic'
import { Skyline } from '@/components/city/Skyline'
import type { CityApi } from '@/components/city/scene'
import type { FreeWindow, Horizon } from '@/lib/slots/windows'
import { dayOffset, earliestPerProvider, HORIZONS, inHorizon, windowHref } from '@/lib/slots/windows'
import { dayLabel } from '@/lib/slots/day-label'
import { applyFilter, filterFor } from '@/lib/home/filter'
import { searchNavPath } from '@/lib/search/target'
import { formatPrice } from '@/lib/format'

// Below this many free windows in the chosen horizon the live counter is hidden
// (honesty rule: a tiny number reads as a broken promise; the windows still glow).
const MIN_LIVE_COUNT = 5
const ROW_MAX = 12
const PLACEHOLDERS = ['ph1', 'ph2', 'ph3', 'ph4', 'ph5', 'ph6'] as const

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const HZ_RANGE: Record<Horizon, [number, number]> = { today: [0, 0], tomorrow: [1, 1], week: [0, 6] }
const HZ_KEY = { today: 'Today', tomorrow: 'Tomorrow', week: 'Week' } as const

type Chip = { slug: string; name: string }

// Home hero + «Ближайшие окна» (DEMO_MAP §3.1, §7.8–7.9). One client island
// because the search, the category chips, the time chips (Сегодня · Завтра ·
// Неделя), the city, the live counter and the slot row share one filter, and
// the scroll-driven fly hands the first window over to the first card. The 3D
// city is imported after idle, on this page only.
export default function HomeLive({
  windows: all,
  counts,
  today,
  chips,
  categoryNames,
  categoryLabel,
}: {
  windows: FreeWindow[] // the city's soonest windows + each provider's first per day
  counts: Record<string, number[]> // exact free windows per provider slug and day offset
  today: string // London date the server computed the windows for
  chips: Chip[]
  categoryNames: Record<string, string[]>
  categoryLabel: Record<string, string>
}) {
  const t = useTranslations('home.v2')
  const locale = useLocale()
  const [horizon, setHorizon] = useState<Horizon>('week')
  const windows = useMemo(() => all.filter((w) => inHorizon(w, horizon, today)), [all, horizon, today])
  const words = { today: t('hzToday'), tomorrow: t('hzTomorrow') }
  const when = t(`when${HZ_KEY[horizon]}`)
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [typed, setTyped] = useState('')
  const [chip, setChip] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [city, setCity] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null)
  const [ph, setPh] = useState(0)

  const cityRef = useRef<CityApi | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const footRef = useRef<HTMLDivElement | null>(null)
  const shadeRef = useRef<HTMLDivElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const flyRef = useRef<HTMLSpanElement | null>(null)
  const liveRef = useRef<HTMLSpanElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const findRef = useMagnetic<HTMLButtonElement>()

  const byId = useMemo(() => new Map(all.map((w) => [w.id, w])), [all])
  const filter = useMemo(() => filterFor(query, chip, windows, categoryNames), [query, chip, windows, categoryNames])
  const shownFilter = useMemo(
    () => (preview ? filterFor('', preview, windows, categoryNames) : filter),
    [preview, filter, windows, categoryNames],
  )
  const row = useMemo(
    () =>
      filter.cats || filter.slugs
        ? applyFilter(windows, filter).slice(0, ROW_MAX)
        : earliestPerProvider(windows, ROW_MAX),
    [filter, windows],
  )
  const firstId = row[0]?.id ?? null
  // The counter is exact: per-provider counts for the chosen days, summed over
  // the providers the filter keeps (the city itself lights at most 420).
  const slugCat = useMemo(() => new Map(all.map((w) => [w.slug, w.categorySlug])), [all])
  const [dayFrom, dayTo] = HZ_RANGE[horizon]
  const countFor = (keep: (slug: string) => boolean) => {
    let n = 0
    for (const [slug, perDay] of Object.entries(counts)) {
      if (!keep(slug)) continue
      for (let d = dayFrom; d <= dayTo; d++) n += perDay[d] ?? 0
    }
    return n
  }
  const counted = countFor((slug) =>
    shownFilter.slugs ? shownFilter.slugs.has(slug) : shownFilter.cats ? shownFilter.cats.includes(slugCat.get(slug) ?? '') : true,
  )
  const showLive = countFor(() => true) >= MIN_LIVE_COUNT

  // Latest values for callbacks the city keeps.
  const latest = useRef({ firstId, byId, router })
  useEffect(() => {
    latest.current = { firstId, byId, router }
  })

  /* ── The fly: a pure function of scroll position (DEMO_MAP §7.8) ── */
  const updateFly = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const vh = window.innerHeight
    const pin = Math.max(0, track.offsetHeight - vh)
    const y = window.scrollY
    const p = pin > 0 ? clamp(y / pin) : y > 0 ? 1 : 0
    const q = clamp((y - pin) / (vh * 0.5))
    const body = bodyRef.current, foot = footRef.current, shade = shadeRef.current
    if (!reduce && body && foot && shade) {
      const a = 1 - smooth(0, 0.42, p)
      body.style.opacity = a.toFixed(3)
      body.style.transform = a < 1 ? `translateY(${(-p * 56).toFixed(1)}px)` : ''
      body.style.visibility = a < 0.02 ? 'hidden' : ''
      foot.style.opacity = (1 - smooth(0, 0.25, p)).toFixed(3)
      shade.style.opacity = (1 - 0.75 * smooth(0.1, 0.6, p)).toFixed(3)
    }
    const fly = flyRef.current
    const c = cityRef.current
    const id = latest.current.firstId
    const firstPane = id ? rowRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] .pane`) ?? null : null
    const hide = () => {
      fly?.classList.remove('on')
      if (firstPane) firstPane.style.visibility = ''
      c?.setDetached(false)
    }
    if (!fly || reduce || !c || !pin) {
      hide()
      return
    }
    c.setFly(p)
    const vis = smooth(0.55, 0.9, p)
    if (vis <= 0 || q >= 1 || !firstPane) {
      hide()
      if (q >= 1) c.setDetached(!!firstPane)
      return
    }
    const wr = c.targetRect()
    if (!wr) {
      hide()
      return
    }
    const cr = firstPane.getBoundingClientRect()
    const e = easeIO(q)
    const x = wr.x + (cr.left - wr.x) * e
    const yy = wr.y + (cr.top - wr.y) * e
    const w = wr.w + (cr.width - wr.w) * e
    const h = wr.h + (cr.height - wr.h) * e
    fly.classList.add('on')
    fly.style.transform = `translate3d(${x.toFixed(1)}px,${yy.toFixed(1)}px,0)`
    fly.style.width = `${w.toFixed(1)}px`
    fly.style.height = `${h.toFixed(1)}px`
    const rb = 2 + 8 * e
    fly.style.borderRadius = `${(w / 2).toFixed(1)}px ${(w / 2).toFixed(1)}px ${rb}px ${rb}px`
    fly.style.opacity = vis.toFixed(3)
    const tm = fly.querySelector<HTMLElement>('.time')
    const win = id ? latest.current.byId.get(id) : undefined
    if (tm && win) {
      const label = timeFmt.format(new Date(win.start))
      if (tm.textContent !== label) tm.textContent = label
      tm.style.opacity = smooth(0.15, 0.7, q).toFixed(3)
      tm.style.transform = `scale(${(0.6 + 0.4 * e).toFixed(3)})`
    }
    fly.classList.toggle('hot', !!firstPane.closest('.slot')?.matches(':hover'))
    firstPane.style.visibility = 'hidden'
    c.setDetached(vis > 0.85)
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0
          updateFly()
        })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [updateFly])

  /* ── The city: lazy, after idle; disposed when leaving home ── */
  useEffect(() => {
    let disposed = false
    let api: CityApi | null = null
    const canvas = canvasRef.current
    if (!canvas) return
    const start = async () => {
      try {
        const mod = await import('@/components/city/scene')
        if (disposed) return
        api = mod.createCity({
          canvas,
          reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          tier: mod.pickTier(),
          fine: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
          paneH: 156,
          onHover: (h) => setTip(h),
          onPick: (id) => {
            const w = latest.current.byId.get(id)
            if (w) latest.current.router.push(windowHref(w))
          },
        })
        if (!api) {
          setCity('failed')
          return
        }
        cityRef.current = api
        api.sync(all.map((w) => ({ id: w.id, cat: w.categorySlug, free: true, day: dayOffset(w.day, today) })))
        setCity('ready')
      } catch {
        if (!disposed) setCity('failed')
      }
    }
    // Safari has no requestIdleCallback.
    const idle = 'requestIdleCallback' in window
    const handle = idle
      ? window.requestIdleCallback(() => void start(), { timeout: 2500 })
      : window.setTimeout(() => void start(), 1200)
    return () => {
      disposed = true
      if (idle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
      cityRef.current = null
      api?.dispose()
    }
  }, [all, today])

  // Emphasis, the horizon, the first window and running state follow the page.
  useEffect(() => {
    const c = cityRef.current
    if (!c) return
    c.setHorizon(...HZ_RANGE[horizon])
  }, [horizon, city])

  useEffect(() => {
    const c = cityRef.current
    if (!c) return
    const cats = shownFilter.cats
    c.setEmphasis(cats === null ? null : cats.length ? cats : ['__none'])
  }, [shownFilter, city])

  useEffect(() => {
    const c = cityRef.current
    if (!c) return
    c.setFirst(firstId)
    updateFly()
  }, [firstId, city, updateFly])

  useEffect(() => {
    const c = cityRef.current
    const hero = heroRef.current
    if (!c || !hero) return
    c.resize()
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? c.resume() : c.pause()), { threshold: 0 })
    io.observe(hero)
    return () => {
      io.disconnect()
      c.pause()
    }
  }, [city])

  // The counter number bumps when it changes.
  const prevN = useRef(counted)
  useEffect(() => {
    if (prevN.current === counted) return
    prevN.current = counted
    const b = liveRef.current?.querySelector('b')
    if (!b) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    b.animate(
      reduce ? [{ opacity: 0.4 }, { opacity: 1 }] : [{ opacity: 0.4, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }],
      { duration: 150, easing: 'cubic-bezier(.23,1,.32,1)' },
    )
  }, [counted])

  // Rotating placeholder while the field is empty and unfocused.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      const el = inputRef.current
      if (!el || el.value || document.activeElement === el) return
      setPh((i) => (i + 1) % PLACEHOLDERS.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  // Typing filters after 120ms.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(typed), 120)
    return () => window.clearTimeout(id)
  }, [typed])

  const liveCats = shownFilter.cats
  const oneCat = liveCats && liveCats.length === 1 ? categoryLabel[liveCats[0]] : null
  const bold = (chunks: React.ReactNode) => <b>{chunks}</b>
  const liveText = oneCat
    ? t.rich('liveCat', { cat: oneCat, n: counted, b: bold, when })
    : liveCats
      ? t.rich('liveQuery', { n: counted, b: bold, when })
      : t.rich('liveAll', { n: counted, b: bold, when })
  const horizonChips = (id: string) => (
    <div className="hz" role="group" aria-label={t('hzLabel')} id={id}>
      {HORIZONS.map((h) => (
        <button key={h} type="button" className="chip" aria-pressed={horizon === h} onClick={() => setHorizon(h)}>
          {t(`hz${HZ_KEY[h]}`)}
        </button>
      ))}
    </div>
  )

  const tipWin = tip ? byId.get(tip.id) : undefined
  const requestHref = query.trim()
    ? `/request/find?q=${encodeURIComponent(query.trim())}`
    : chip
      ? `/request?category=${encodeURIComponent(chip)}`
      : '/request/find'
  const reset = () => {
    setChip(null)
    setTyped('')
    setQuery('')
  }
  const scrollRow = (dir: number) => {
    const r = rowRef.current
    if (!r) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <section className="hero-track" ref={trackRef}>
        <div className="hero" ref={heroRef}>
          <div className={`hero-stage ${city === 'ready' ? 'ready' : ''}`}>
            <canvas ref={canvasRef} aria-hidden="true" />
          </div>
          <div className="hero-fallback" aria-hidden="true">
            <Skyline lit={all.length} />
          </div>
          <div className="hero-shade" ref={shadeRef} />
          <div className="wrap hero-inner">
            <div className="hero-body" ref={bodyRef}>
              <h1>
                {t('title1')}
                <br />
                {t('title2')}
              </h1>
              <p className="lede">{all.length ? t('lede') : t('ledeNoCity')}</p>
              <form
                className="search"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault()
                  router.push(searchNavPath(inputRef.current?.value ?? '') ?? '/search')
                }}
              >
                <label className="sr-only" htmlFor="home-q">
                  {t('searchLabel')}
                </label>
                <input
                  ref={inputRef}
                  id="home-q"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder={t(PLACEHOLDERS[ph])}
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value)
                    if (chip) setChip(null)
                  }}
                />
                <button ref={findRef} className="btn btn-amber magnetic" type="submit">
                  {t('searchCta')}
                </button>
              </form>
              {chips.length > 0 && (
                <div className="chips" role="group" aria-label={t('chipsLabel')} onPointerLeave={() => setPreview(null)}>
                  {chips.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      className="chip"
                      aria-pressed={chip === c.slug}
                      onClick={() => {
                        setChip(chip === c.slug ? null : c.slug)
                        setTyped('')
                        setQuery('')
                      }}
                      onPointerEnter={(e) => {
                        if (e.pointerType !== 'touch') setPreview(c.slug)
                      }}
                      onFocus={() => setPreview(c.slug)}
                      onBlur={() => setPreview(null)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="trust-mini">
                <IconPhone stroke={1.75} aria-hidden="true" />
                <span>{t('trustMini')}</span>
              </p>
            </div>
            <div className="hero-foot" ref={footRef}>
              <div className="foot-l">
                {all.length > 0 && horizonChips('hz-hero')}
                {showLive && (
                  <p className="live" aria-live="polite">
                    <span className="live-dot" aria-hidden="true" />
                    <span ref={liveRef}>{liveText}</span>
                  </p>
                )}
              </div>
              {city !== 'failed' && all.length > 0 && (
                <p className="hero-hint">
                  <span className="hint-fine">{t('hintFine')}</span>
                  <span className="hint-touch">{t('hintTouch')}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="night free-next" aria-labelledby="next-h">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="next-h">{t('nextTitle')}</h2>
              <p className="sec-sub">{filter.cats || filter.slugs ? t('nextSubFiltered') : t('nextSub')}</p>
            </div>
            <div className="sec-tools">
              {all.length > 0 && horizonChips('hz-row')}
              {row.length > 3 && (
                <div className="row-ctrl">
                  <button type="button" aria-label={t('prev')} onClick={() => scrollRow(-1)}>
                    <IconChevronLeft stroke={2} />
                  </button>
                  <button type="button" aria-label={t('next')} onClick={() => scrollRow(1)}>
                    <IconChevronRight stroke={2} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="slot-row" ref={rowRef}>
            {row.length === 0 ? (
              <div className="empty-night">
                <strong>{windows.length ? t('emptyTitle', { when }) : t('emptyNone', { when })}</strong>
                {windows.length > 0 && <p>{t('emptyText')}</p>}
                <div className="acts">
                  <Link className="btn btn-amber" href={requestHref}>
                    {t('postRequest')}
                  </Link>
                  {(filter.cats || filter.slugs) && (
                    <button type="button" className="btn btn-ghost" onClick={reset}>
                      {t('showAll')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              row.map((w) => {
                const time = timeFmt.format(new Date(w.start))
                const price = formatPrice(w.pricePence)
                return (
                  <Link
                    key={w.id}
                    href={windowHref(w)}
                    className="slot"
                    data-id={w.id}
                  >
                    <Pane time={time} />
                    <span className="slot-day">{dayLabel(w.day, today, locale, words)}</span>
                    <span className="slot-name">{w.name}</span>
                    <span className="slot-svc">
                      {w.serviceName} · <b>{price}</b>
                    </span>
                    <span className="slot-where">{w.borough}</span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </section>

      <span className="fly pane" ref={flyRef} aria-hidden="true">
        <span className="glow" />
        <span className="time" />
      </span>
      {tipWin && tip && (
        <div className="city-tip on" style={{ '--x': `${Math.min(tip.x + 16, window.innerWidth - 270)}px`, '--y': `${tip.y + 18}px` }}>
          <b>{tipWin.name}</b>
          <span>
            {tipWin.serviceName} · {formatPrice(tipWin.pricePence)}
          </span>
          <br />
          <i>
            {dayLabel(tipWin.day, today, locale, words)}, {timeFmt.format(new Date(tipWin.start))}
          </i>{' '}
          <span>· {t('tipBook')}</span>
        </div>
      )}
    </>
  )
}

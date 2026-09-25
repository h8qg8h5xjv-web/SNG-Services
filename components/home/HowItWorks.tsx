'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconPhone } from '@tabler/icons-react'
import ServiceNeedBar from '@/components/requests/ServiceNeedBar'

const STEPS = [
  { h: 'home.how.step1', p: 'home.v2.step1p' },
  { h: 'home.how.step2', p: 'home.v2.step2p' },
  { h: 'home.how.step3', p: 'home.v2.step3p' },
] as const

// «Три шага до записи» (DEMO_MAP §3.1): tabs + an illustrated request thread.
// The thread is a labelled example — no counts, names or prices. Autoplays once
// when 45% visible (2.8s per step), stops on the first interaction; reduced
// motion shows step 1 statically.
export default function HowItWorks() {
  const t = useTranslations()
  const [step, setStep] = useState(0)
  const [animate, setAnimate] = useState(false)
  const touched = useRef(false)
  const chatRef = useRef<HTMLDivElement | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const chat = chatRef.current
    if (!chat || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timers: number[] = []
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setAnimate(true)
        let k = 0
        const tick = () => {
          if (touched.current || ++k > 2) return
          setStep(k)
          timers.push(window.setTimeout(tick, 2800))
        }
        timers.push(window.setTimeout(tick, 2800))
      },
      { threshold: 0.45 },
    )
    io.observe(chat)
    return () => {
      io.disconnect()
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const choose = (i: number) => {
    touched.current = true
    setAnimate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setStep(i)
    tabs.current[i]?.focus()
  }
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: 2, ArrowLeft: 2 }[e.key]
    if (!next) return
    e.preventDefault()
    choose((step + next) % 3)
  }

  // Staggered rise for the lines of the current step: line n enters at n × 120ms.
  const line = (base: string, on: boolean, n: number) =>
    animate && on ? { className: `${base} in`, style: { '--d': `${n * 120}ms` } } : { className: base }

  const offers = [
    [t('home.v2.chatOffer1'), '11:00'],
    [t('home.v2.chatOffer2'), '14:30'],
    [t('home.v2.chatOffer3'), '16:00'],
  ] as const

  return (
    <section className="how" aria-labelledby="how-h">
      <div className="wrap">
        <div className="how-grid">
          <div>
            <h2 id="how-h">{t('home.v2.howTitle')}</h2>
            <ol className="steps" role="tablist" aria-label={t('home.v2.howStepsLabel')} onKeyDown={onKey}>
              {STEPS.map((s, i) => (
                <li key={s.h} role="presentation">
                  <button
                    ref={(el) => {
                      tabs.current[i] = el
                    }}
                    type="button"
                    className="step"
                    role="tab"
                    id={`how-step-${i}`}
                    aria-selected={i === step}
                    aria-controls="how-chat"
                    tabIndex={i === step ? 0 : -1}
                    onClick={() => choose(i)}
                  >
                    <span className="step-n">{i + 1}</span>
                    <span>
                      <span className="step-h">{t(s.h)}</span>
                      <span className="step-p">{t(s.p)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="how-cta">
              <ServiceNeedBar />
            </div>
          </div>
          <div className="chat" id="how-chat" role="tabpanel" aria-labelledby={`how-step-${step}`} aria-live="polite" ref={chatRef}>
            <div className="chat-top">
              <span className="logo-win" aria-hidden="true" />
              <b>{t('home.v2.chatTitle')}</b>
              <span>{t('home.v2.chatExample')}</span>
            </div>
            <div className="msg me">{t('home.v2.chatMe')}</div>
            {step === 0 && (
              <>
                <div {...line('meta', true, 1)}>{t('home.v2.chatSeen')}</div>
                <div {...line('typing', true, 2)} role="img" aria-label={t('home.v2.chatTyping')}>
                  <i />
                  <i />
                  <i />
                </div>
              </>
            )}
            {step >= 1 && (
              <>
                <div {...line('meta', step === 1, 1)}>{t('home.v2.chatReplies')}</div>
                {offers.map(([who, time], k) =>
                  step === 2 && k > 0 ? null : (
                    <div key={who} {...line(step === 2 ? 'offer picked' : 'offer', step === 1, k + 2)}>
                      <b>{who}</b>
                      <span className="when">{t('home.v2.chatSat', { time })}</span>
                    </div>
                  ),
                )}
              </>
            )}
            {step === 2 && (
              <div {...line('chat-done', true, 1)}>
                <span className="logo-win" aria-hidden="true" />
                <b>{t('home.v2.chatDone')}</b>
                <span>{t('home.v2.chatDoneText')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="trust">
          <div className="trust-ico" aria-hidden="true">
            <IconPhone stroke={1.75} />
          </div>
          <p>
            {t('home.v2.trustTitle')}
            <span>{t('home.v2.trustText')}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

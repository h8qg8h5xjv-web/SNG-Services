'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { IconDevices, IconHeart, IconId } from '@tabler/icons-react'
import SignInForm from '@/components/cabinet/auth/SignInForm'
import SignUpForm from '@/components/cabinet/auth/SignUpForm'
import EmailLinkForm from '@/components/cabinet/auth/EmailLinkForm'

type Tab = 'signIn' | 'signUp'
// «Забыли пароль?» and the email link live under the «Войти» tab.
type SignInView = 'password' | 'reset' | 'magic'

const TABS: Tab[] = ['signIn', 'signUp']

// Sign-in prompt at the top of the cabinet when signed out: email + password,
// or a new account, with the email link kept as a fallback. On return, browser
// data auto-links (see AutoLink).
export default function LoginBlock() {
  const t = useTranslations('cabinet')
  const ta = useTranslations('cabinetAuth')
  const tc = useTranslations('cabinet2')
  const params = useSearchParams()
  // Set by auth/confirm when the email link didn't sign in.
  const linkFailed = params.get('error') === 'link'
  const [tab, setTab] = useState<Tab>('signIn')
  // ?auth=forgot: «Запросить новую ссылку» from an expired reset link.
  const [view, setView] = useState<SignInView>(params.get('auth') === 'forgot' ? 'reset' : 'password')
  const [email, setEmail] = useState('')
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ signIn: null, signUp: null })

  function select(next: Tab) {
    setTab(next)
    setView('password')
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length]
    select(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="card cab-login" aria-labelledby="login-h">
      <div>
        <h2 id="login-h" className="h3">
          {t('loginTitle')}
        </h2>
        <p className="muted">{t('loginBody')}</p>
      </div>
      <div className="cab-auth">
        <div className="auth-tabs" role="tablist" aria-label={ta('tabsLabel')} onKeyDown={onTabKey}>
          {TABS.map((id) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el
              }}
              type="button"
              role="tab"
              id={`auth-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="auth-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => select(id)}
            >
              {id === 'signIn' ? ta('tabSignIn') : ta('tabSignUp')}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="auth-panel" aria-labelledby={`auth-tab-${tab}`}>
          {linkFailed && (
            <p className="msg-err-inline" role="alert">
              {t('loginLinkFailed')}
            </p>
          )}
          {tab === 'signUp' ? (
            <SignUpForm email={email} onEmail={setEmail} />
          ) : view === 'password' ? (
            <SignInForm
              email={email}
              onEmail={setEmail}
              onForgot={() => setView('reset')}
              onMagicLink={() => setView('magic')}
            />
          ) : (
            <EmailLinkForm key={view} kind={view} email={email} onEmail={setEmail} onBack={() => setView('password')} />
          )}
        </div>
      </div>
      <ul className="cab-perks" aria-label={tc('perksLabel')}>
        <li>
          <IconDevices stroke={1.75} aria-hidden="true" />
          {tc('perkDevices')}
        </li>
        <li>
          <IconHeart stroke={1.75} aria-hidden="true" />
          {tc('perkSaved')}
        </li>
        <li>
          <IconId stroke={1.75} aria-hidden="true" />
          {tc('perkMaster')}
        </li>
      </ul>
    </section>
  )
}

// Builds the Supabase auth email templates (supabase/templates/*.html) from one
// layout, so the five emails never drift apart. Russian first, English below a
// thin divider, one amber button, the link as plain text under it.
// Run after changing copy or layout: npm run email:templates
//
// The output is pasted into the Supabase dashboard by hand (README «Письма
// входа») and used by local Mailpit through supabase/config.toml.
//
// Links. Both confirm routes (/[locale]/cabinet/auth/confirm and
// /admin/auth/confirm) take ?token_hash=&type= and call verifyOtp. The default
// {{ .ConfirmationURL }} doesn't work here: the browser client uses PKCE, so
// Supabase would redirect with ?code=, which neither route reads.
// - Sign-in and signup: {{ .RedirectTo }} is the confirm route the app passed
//   (with the right locale, or the admin one), so the link goes back there.
//   The app keeps that URL free of a query string, so "?token_hash" is safe.
// - Invite, recovery, email change can be sent from the dashboard, which passes
//   no redirect: they use the Russian cabinet route on {{ .SiteURL }}.
//
// Email-safe: tables, inline styles, no web fonts, a VML button for Outlook,
// colour-scheme meta + a prefers-color-scheme block for clients that honour it.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'supabase/templates')

const ICON = 'https://www.oknolondon.com/icons/icon-192.png'
const C = {
  dusk: '#0F1830',
  page: '#F3F5F9',
  card: '#FFFFFF',
  ink: '#0F1830',
  text: '#3A4458',
  mute: '#6B7488',
  line: '#E3E7EF',
  lamp: '#FFB547',
  nightText: '#EEF1F8',
}
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

type Lang = { title: string; body: string; ignore: string }
type Template = {
  file: string
  configKey: string
  subject: string
  link: string
  button: string
  ru: Lang
  en: Lang
}

const cabinet = (type: string) =>
  `{{ .SiteURL }}/ru/cabinet/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}`
const back = `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email`

export const TEMPLATES: Template[] = [
  {
    file: 'magic-link.html',
    configKey: 'magic_link',
    subject: 'Вход в Okno · Sign in to Okno',
    link: back,
    button: 'Войти · Sign in',
    ru: {
      title: 'Вход в Okno',
      body: 'Нажмите кнопку — и вы в кабинете. Ссылка сработает один раз и действует один час.',
      ignore: 'Если вы не запрашивали вход, просто удалите это письмо.',
    },
    en: {
      title: 'Sign in to Okno',
      body: 'Tap the button and you’re in your cabinet. The link works once and expires in an hour.',
      ignore: 'Didn’t ask to sign in? Just delete this email.',
    },
  },
  {
    file: 'confirm-signup.html',
    configKey: 'confirmation',
    subject: 'Ваш кабинет в Okno · Your Okno cabinet',
    link: back,
    button: 'Подтвердить почту · Confirm email',
    ru: {
      title: 'Кабинет почти готов',
      body: 'Подтвердите почту — и кабинет ваш: заявки, записи и сохранённые мастера на любом устройстве.',
      ignore: 'Если вы не создавали кабинет, просто удалите это письмо.',
    },
    en: {
      title: 'Your cabinet is almost ready',
      body: 'Confirm your email and the cabinet is yours: requests, bookings and saved specialists on any device.',
      ignore: 'Didn’t sign up? Just delete this email.',
    },
  },
  {
    file: 'reset-password.html',
    configKey: 'recovery',
    subject: 'Доступ к Okno · Get back into Okno',
    link: cabinet('recovery'),
    button: 'Войти · Sign in',
    ru: {
      title: 'Вернём доступ',
      body: 'В Okno нет паролей — вход только по ссылке. Нажмите кнопку, и вы снова в кабинете.',
      ignore: 'Если вы ничего не запрашивали, просто удалите это письмо.',
    },
    en: {
      title: 'Let’s get you back in',
      body: 'Okno has no passwords — you sign in with a link. Tap the button and you’re back in your cabinet.',
      ignore: 'Didn’t ask for this? Just delete this email.',
    },
  },
  {
    file: 'change-email.html',
    configKey: 'email_change',
    subject: 'Новая почта в Okno · Confirm your new email',
    link: cabinet('email_change'),
    button: 'Подтвердить · Confirm',
    ru: {
      title: 'Подтвердите новую почту',
      body: 'Вы меняете почту в Okno: {{ .Email }} → {{ .NewEmail }}. Нажмите кнопку, чтобы подтвердить.',
      ignore: 'Если вы ничего не меняли, удалите письмо — почта останется прежней.',
    },
    en: {
      title: 'Confirm your new email',
      body: 'You’re changing your Okno email from {{ .Email }} to {{ .NewEmail }}. Tap the button to confirm.',
      ignore: 'Didn’t change anything? Delete this email and nothing changes.',
    },
  },
  {
    file: 'invite.html',
    configKey: 'invite',
    subject: 'Приглашение в Okno · You’re invited to Okno',
    link: cabinet('invite'),
    button: 'Принять приглашение · Accept invite',
    ru: {
      title: 'Вас пригласили в Okno',
      body: 'Okno — запись к русскоязычным мастерам в Лондоне. Нажмите кнопку, чтобы войти: кабинет уже создан.',
      ignore: 'Если вы не ждали приглашения, просто удалите это письмо.',
    },
    en: {
      title: 'You’re invited to Okno',
      body: 'Okno is how Russian-speaking London books its specialists. Tap the button to sign in — your cabinet is ready.',
      ignore: 'Not expecting this? Just delete this email.',
    },
  },
]

function langBlock(l: Lang, lang: 'ru' | 'en', size: 'big' | 'small'): string {
  const h = size === 'big' ? 24 : 19
  const p = size === 'big' ? 16 : 15
  return `<tr>
              <td lang="${lang}" style="padding: 0 0 ${size === 'big' ? 20 : 4}px 0;">
                <h1 class="ink" style="margin: 0 0 10px 0; font-family: ${FONT}; font-size: ${h}px; line-height: 1.25; font-weight: 700; color: ${C.ink};">${l.title}</h1>
                <p class="text" style="margin: 0; font-family: ${FONT}; font-size: ${p}px; line-height: 1.55; color: ${C.text};">${l.body}</p>
              </td>
            </tr>`
}

function render(t: Template): string {
  return `<!DOCTYPE html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${t.ru.title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  a { color: inherit; }
  @media (prefers-color-scheme: dark) {
    .page { background-color: #0A1124 !important; }
    .card { background-color: #16213F !important; }
    .ink { color: ${C.nightText} !important; }
    .text { color: #C5CCDD !important; }
    .mute { color: #9AA3B8 !important; }
    .rule { border-color: #2A375C !important; }
    .fallback { color: ${C.lamp} !important; }
  }
  @media (max-width: 600px) {
    .pad { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body class="page" style="margin: 0; padding: 0; background-color: ${C.page}; -webkit-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${t.ru.body} · ${t.en.body}</div>
  <table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${C.page};">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
          <tr>
            <td class="pad" bgcolor="${C.dusk}" style="background-color: ${C.dusk}; border-radius: 16px 16px 0 0; padding: 22px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <img src="${ICON}" width="36" height="36" alt="" style="display: block; width: 36px; height: 36px; border: 0; border-radius: 9px;">
                  </td>
                  <td style="vertical-align: middle; font-family: ${FONT}; font-size: 24px; line-height: 1; font-weight: 800; letter-spacing: -0.5px; color: ${C.nightText};">Okno</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="card pad" bgcolor="${C.card}" style="background-color: ${C.card}; border-radius: 0 0 16px 16px; padding: 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${langBlock(t.ru, 'ru', 'big')}
            <tr><td class="rule" style="border-top: 1px solid ${C.line}; font-size: 0; line-height: 0; padding: 0 0 20px 0;">&nbsp;</td></tr>
            ${langBlock(t.en, 'en', 'small')}
            <tr>
              <td style="padding: 24px 0 8px 0;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${t.link}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="25%" stroke="f" fillcolor="${C.lamp}">
                  <w:anchorlock/>
                  <center style="color:${C.ink};font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:bold;">${t.button}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${t.link}" target="_blank" style="display: inline-block; background-color: ${C.lamp}; color: ${C.ink}; font-family: ${FONT}; font-size: 16px; font-weight: 700; line-height: 48px; padding: 0 28px; border-radius: 12px; text-decoration: none; mso-hide: all;">${t.button}</a>
                <!--<![endif]-->
              </td>
            </tr>
            <tr>
              <td class="mute" style="padding: 16px 0 0 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${C.mute};">
                Если кнопка не работает, откройте ссылку · If the button doesn’t work, open this link:<br>
                <a class="fallback" href="${t.link}" target="_blank" style="color: ${C.ink}; text-decoration: underline; word-break: break-all;">${t.link}</a>
              </td>
            </tr>
            <tr>
              <td class="mute" style="padding: 20px 0 0 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${C.mute};">
                ${t.ru.ignore}<br>${t.en.ignore}
              </td>
            </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mute" align="center" style="padding: 20px 12px 0 12px; font-family: ${FONT}; font-size: 12px; line-height: 1.5; color: ${C.mute};">
              Okno · London<br>Для · For {{ .Email }}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

fs.mkdirSync(OUT, { recursive: true })
for (const t of TEMPLATES) {
  fs.writeFileSync(path.join(OUT, t.file), render(t))
  console.log(`supabase/templates/${t.file}  ${t.subject}`)
}

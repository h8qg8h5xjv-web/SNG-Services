// Runs ONE iteration of the wave scheduler by calling the protected route the
// real cron will call — so you can watch the request cycle locally without a
// scheduler. The dev server must be running (npm run dev); notification output
// (the ConsoleChannel "emails") prints in that server's console.
//
//   npm run requests:advance
//
// Reads CRON_SECRET and (optionally) ADVANCE_URL from .env.local.

const secret = process.env.CRON_SECRET
if (!secret) {
  console.error('Missing CRON_SECRET. Add it to .env.local (any long random string).')
  process.exit(1)
}
const url = process.env.ADVANCE_URL ?? 'http://localhost:3000/api/requests/advance'

async function main() {
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${secret}` } })
  } catch {
    console.error(`Could not reach ${url}. Is the dev server running (npm run dev)?`)
    process.exit(1)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`advance failed (${res.status}):`, body)
    process.exit(1)
  }
  console.log('advance ok:', body, '\n(notifications, if any, printed in the dev server console)')
}

main()

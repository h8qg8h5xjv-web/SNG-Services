// Seed-style scripts write demo data with the service-role key. .env.local can
// point at production, so they refuse any non-local Supabase unless the caller
// opts in explicitly with --allow-remote.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const ALLOW_REMOTE_FLAG = '--allow-remote'

export function assertLocalDb(url: string, scriptName: string): void {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    console.error(`${scriptName}: NEXT_PUBLIC_SUPABASE_URL is not a valid URL.`)
    process.exit(1)
  }
  if (LOCAL_HOSTS.has(host)) return
  if (process.argv.includes(ALLOW_REMOTE_FLAG)) {
    console.warn(`${scriptName}: writing to REMOTE database ${host} (${ALLOW_REMOTE_FLAG}).`)
    return
  }
  console.error(
    `${scriptName}: refusing to run against ${host}. Only localhost / 127.0.0.1 are allowed.\n` +
      `If you really mean to write to this database, pass ${ALLOW_REMOTE_FLAG} ` +
      `(npm run <script> -- ${ALLOW_REMOTE_FLAG}).`,
  )
  process.exit(1)
}

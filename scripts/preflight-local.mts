// Pre-flight before ANY browser flow that can write data (booking, requests,
// sign-in, tracking). Run it every time, right before the flow — not once per
// session: .env.local can change under a running server.
//
//   npm run preflight:local            # checks http://localhost:3000
//   npm run preflight:local -- 3100    # another port
//
// 1. .env.local points NEXT_PUBLIC_SUPABASE_URL at localhost / 127.0.0.1.
// 2. The RUNNING server agrees: the Supabase URL inlined into the client
//    bundles it serves is local, and neither the production host (read from
//    .env.local.cloud, never printed) nor any other *.supabase.co project URL
//    appears. supabase-js ships doc examples (xyzcompany, project-id, example,
//    myproject) in its bundled comments; those are ignored.
// Prints hosts only, never keys. Exits 1 on any doubt.

import fs from 'node:fs'
import path from 'node:path'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const DOC_EXAMPLES = new Set(['xyzcompany', 'project-id', 'example', 'myproject'])
const port = process.argv[2] ?? '3000'
const base = `http://localhost:${port}`
// A page whose client code creates the browser Supabase client (sign-in).
const PROBE = '/en/cabinet/requests'

function fail(msg: string): never {
  console.error(`✗ preflight: ${msg}`)
  process.exit(1)
}

function supabaseHost(file: string): string | null {
  const p = path.join(import.meta.dirname, '..', file)
  if (!fs.existsSync(p)) return null
  const line = fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
  if (!line) return null
  try {
    return new URL(line.slice(line.indexOf('=') + 1).trim()).hostname
  } catch {
    return null
  }
}

const fileHost = supabaseHost('.env.local')
if (!fileHost) fail('no valid NEXT_PUBLIC_SUPABASE_URL in .env.local.')
const prodHost = supabaseHost('.env.local.cloud')
if (!LOCAL_HOSTS.has(fileHost)) fail(`.env.local points at ${fileHost}, not a local Supabase.`)

let html: string
try {
  const res = await fetch(base + PROBE)
  if (!res.ok) fail(`${base}${PROBE} answered ${res.status}.`)
  html = await res.text()
} catch {
  fail(`no server at ${base}.`)
}

const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], base).href)
let local = false
for (const src of scripts) {
  const js = await (await fetch(src)).text()
  if (prodHost && js.includes(prodHost)) fail('the running server serves the PRODUCTION Supabase URL. Restart it.')
  const remote = [...js.matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co(?![a-z])/g)].find((m) => !DOC_EXAMPLES.has(m[1]))
  if (remote) fail('the running server serves a remote *.supabase.co URL. Restart it.')
  if (/http:\/\/(?:127\.0\.0\.1|localhost):54321/.test(js)) local = true
}
if (!local) fail('could not find the Supabase URL in the served client bundles; cannot confirm the server is local.')

console.log(`✓ preflight: .env.local → ${fileHost}; server at ${base} serves the local Supabase URL`)

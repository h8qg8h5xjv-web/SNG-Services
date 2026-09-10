import { NextResponse, type NextRequest } from 'next/server'
import { advanceRequests } from '@/lib/requests/advance'

export const dynamic = 'force-dynamic'

// Wave scheduler entry point (REQUESTS §5). Meant to be called every few minutes
// by Supabase pg_cron via pg_net (see README → "Wave scheduler"). Protected by a
// shared secret in CRON_SECRET so only the scheduler can trigger it.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await advanceRequests()
  return NextResponse.json({ ok: true, ...result })
}

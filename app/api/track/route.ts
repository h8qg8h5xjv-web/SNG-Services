import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { recordEvents, type TrackEvent } from '@/lib/tracking/events'

// Receives batched analytics events from the client (impressions, booking_started).
// Always returns 204 — logging must never affect the user.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { events?: TrackEvent[] }
    const events = Array.isArray(body?.events) ? body.events.slice(0, 50) : []
    const sessionId = (await cookies()).get('sng_sid')?.value ?? null
    await recordEvents(events, sessionId)
  } catch {
    // ignore malformed payloads
  }
  return new NextResponse(null, { status: 204 })
}

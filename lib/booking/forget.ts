// "Delete my data" for a guest's direct bookings. An upcoming booking that is
// still on (pending / confirmed) stays whole — the specialist expects the
// visit; the guest cancels it with them. A booking that already happened, or
// was cancelled, loses the customer's name, phone and email; the rest stays
// for statistics. Pure: the server action applies it (lib/booking/guest.ts).

export type ForgetRow = { ref: string; endsAt: string; status: 'pending' | 'confirmed' | 'cancelled' }

export function splitForForget(rows: ForgetRow[], now: Date): { wipe: string[]; keep: string[] } {
  const wipe: string[] = []
  const keep: string[] = []
  for (const r of rows) {
    const over = Date.parse(r.endsAt) <= now.getTime()
    if (over || r.status === 'cancelled') wipe.push(r.ref)
    else keep.push(r.ref)
  }
  return { wipe, keep }
}

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL(`/${locale}/business/login`, request.url), { status: 303 })
}

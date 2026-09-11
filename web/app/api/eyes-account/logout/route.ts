import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { EYES_ACCOUNT_COOKIE } from '@/lib/eyes-account/session'

export async function POST() {
  const store = await cookies()
  store.delete(EYES_ACCOUNT_COOKIE)
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { ACCOUNT_EMAIL_COOKIE } from '@/lib/account-session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: ACCOUNT_EMAIL_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

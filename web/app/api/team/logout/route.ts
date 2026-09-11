import { NextResponse } from 'next/server'
import { TEAM_SESSION_COOKIE, teamSessionCookieOptions } from '@/lib/team-auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    ...teamSessionCookieOptions(''),
    maxAge: 0,
  })
  response.cookies.delete(TEAM_SESSION_COOKIE)
  return response
}

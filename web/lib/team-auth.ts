import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

import { getTeamSessionSecret } from '@/lib/security/session-secret'

export const TEAM_SESSION_COOKIE = 'eyes_team_session'
const SESSION_DAYS = 30

export type TeamSession = {
  sessionToken: string
  discordId: string | null
  username: string | null
  exp: number
}

function getSessionSecret(): string {
  return getTeamSessionSecret()
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function createTeamSessionCookieValue(session: {
  sessionToken: string
  discordId: string | null
  username: string | null
}): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60
  const payload = Buffer.from(
    JSON.stringify({
      t: session.sessionToken,
      d: session.discordId,
      u: session.username,
      e: exp,
    }),
  ).toString('base64url')
  const sig = signPayload(payload)
  return `${payload}.${sig}`
}

export function parseTeamSessionCookie(raw: string | undefined | null): TeamSession | null {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = signPayload(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      t?: string
      d?: string | null
      u?: string | null
      e?: number
    }
    if (!data.t || !data.e || data.e < Math.floor(Date.now() / 1000)) return null
    return {
      sessionToken: data.t,
      discordId: data.d ?? null,
      username: data.u ?? null,
      exp: data.e,
    }
  } catch {
    return null
  }
}

export async function getTeamSessionFromCookies(): Promise<TeamSession | null> {
  const store = await cookies()
  return parseTeamSessionCookie(store.get(TEAM_SESSION_COOKIE)?.value)
}

export function teamSessionCookieOptions(value: string) {
  return {
    name: TEAM_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }
}

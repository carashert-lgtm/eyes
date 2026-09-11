import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { EyesAccountSession } from '@/lib/eyes-account/types'
import { getTeamSessionSecret } from '@/lib/security/session-secret'

export const EYES_ACCOUNT_COOKIE = 'eyes_account_session'
const SESSION_DAYS = 30

function signPayload(payload: string): string {
  return createHmac('sha256', getTeamSessionSecret()).update(payload).digest('base64url')
}

export function createEyesAccountCookieValue(session: Omit<EyesAccountSession, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60
  const payload = Buffer.from(
    JSON.stringify({ i: session.accountId, e: session.email.toLowerCase(), x: exp }),
  ).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

export function parseEyesAccountCookie(raw: string | undefined | null): EyesAccountSession | null {
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
      i?: string
      e?: string
      x?: number
    }
    if (!data.i || !data.e || !data.x || data.x < Math.floor(Date.now() / 1000)) return null
    return { accountId: data.i, email: data.e, exp: data.x }
  } catch {
    return null
  }
}

export async function getEyesAccountFromCookies(): Promise<EyesAccountSession | null> {
  const store = await cookies()
  return parseEyesAccountCookie(store.get(EYES_ACCOUNT_COOKIE)?.value)
}

export function eyesAccountCookieOptions(value: string) {
  return {
    name: EYES_ACCOUNT_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }
}

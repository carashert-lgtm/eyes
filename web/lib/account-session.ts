import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { getTeamSessionSecret } from '@/lib/security/session-secret'

export const ACCOUNT_EMAIL_COOKIE = 'eyes_account_email'
const SESSION_DAYS = 365

export type EmailAccountSession = {
  email: string
  exp: number
}

function signPayload(payload: string): string {
  return createHmac('sha256', getTeamSessionSecret()).update(payload).digest('base64url')
}

export function createEmailAccountCookieValue(email: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), x: exp })).toString(
    'base64url',
  )
  return `${payload}.${signPayload(payload)}`
}

export function parseEmailAccountCookie(raw: string | undefined | null): EmailAccountSession | null {
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
      e?: string
      x?: number
    }
    if (!data.e || !data.x || data.x < Math.floor(Date.now() / 1000)) return null
    return { email: data.e, exp: data.x }
  } catch {
    return null
  }
}

export async function getEmailAccountFromCookies(): Promise<EmailAccountSession | null> {
  const store = await cookies()
  return parseEmailAccountCookie(store.get(ACCOUNT_EMAIL_COOKIE)?.value)
}

export function emailAccountCookieOptions(value: string) {
  return {
    name: ACCOUNT_EMAIL_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }
}

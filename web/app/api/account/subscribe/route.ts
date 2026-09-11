import { NextRequest, NextResponse } from 'next/server'
import { subscribeEmailAccount } from '@/lib/account-store'
import {
  createEmailAccountCookieValue,
  emailAccountCookieOptions,
} from '@/lib/account-session'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('account-subscribe', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  try {
    const account = await subscribeEmailAccount(email)
    const response = NextResponse.json({
      ok: true,
      email: account.email,
      message: 'You are subscribed to Eyes Open updates.',
    })
    response.cookies.set(emailAccountCookieOptions(createEmailAccountCookieValue(email)))
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Subscribe failed'
    const status = /unavailable|reach activation/i.test(message) ? 503 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

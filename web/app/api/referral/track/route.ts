import { NextRequest, NextResponse } from 'next/server'
import { forwardToBot } from '@/lib/bot-webhook'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { normalizeReferralCode } from '@/lib/security/validation'

const LIMIT = 60
const WINDOW_MS = 15 * 60 * 1000

/** Records referral link click — bot syncs authoritative counts. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('referral-track', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { referralCode?: string; source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const referralCode = normalizeReferralCode(body.referralCode)
  if (!referralCode) {
    return NextResponse.json({ error: 'Valid referralCode required' }, { status: 400 })
  }

  await forwardToBot('/webhook/referral-click', {
    referralCode,
    source: body.source ?? 'web',
  })

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('referral-track-get', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const ref = normalizeReferralCode(request.nextUrl.searchParams.get('ref'))
  if (!ref) {
    return NextResponse.json({ error: 'Valid ref required' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, referralCode: ref })
}

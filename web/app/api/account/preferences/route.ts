import { NextRequest, NextResponse } from 'next/server'
import { getAccountProfile, subscribeEmailAccount, updateEmailPreferences } from '@/lib/account-store'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import type { EmailAlertPrefs } from '@/lib/account-types'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 30
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in with your Eyes account first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('account-prefs', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: Partial<EmailAlertPrefs>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let profile = await getAccountProfile({ email: identity.email })
  if (!profile?.account) {
    await subscribeEmailAccount(identity.email)
    profile = await getAccountProfile({ email: identity.email })
  }
  const current = profile?.account.emailAlerts ?? {
    launches: true,
    presale: true,
    season: true,
  }

  const prefs: EmailAlertPrefs = {
    launches: body.launches ?? current.launches,
    presale: body.presale ?? current.presale,
    season: body.season ?? current.season,
  }

  try {
    const account = await updateEmailPreferences({ email: identity.email }, prefs)
    return NextResponse.json({ ok: true, account, emailAlerts: account.emailAlerts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save preferences'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

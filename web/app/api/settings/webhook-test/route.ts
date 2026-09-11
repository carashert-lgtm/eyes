import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { getAccountSettings } from '@/lib/settings/account-settings-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('webhook-test', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const settings = await getAccountSettings(identity.email)
  const url = settings.launchWebhookUrl?.trim()
  if (!url) {
    return NextResponse.json({ error: 'Save a webhook URL first' }, { status: 400 })
  }
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 })
  }

  const body = JSON.stringify({
    event: 'webhook.test',
    sentAt: new Date().toISOString(),
    data: {
      message: 'Eyes Open launch webhook test',
      accountEmail: identity.email,
    },
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'EyesOpen-LaunchWebhook/1.0',
  }
  if (settings.launchWebhookSecret) {
    const sig = createHmac('sha256', settings.launchWebhookSecret).update(body).digest('hex')
    headers['X-Eyes-Signature'] = `sha256=${sig}`
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(12_000),
    })
    return NextResponse.json({
      ok: true,
      status: res.status,
      delivered: res.ok,
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Webhook delivery failed',
      },
      { status: 502 },
    )
  }
}

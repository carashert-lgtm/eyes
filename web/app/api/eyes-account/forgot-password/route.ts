import { NextRequest, NextResponse } from 'next/server'
import { callBot } from '@/lib/bot-webhook'
import { sendPasswordResetEmail } from '@/lib/email/templates'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

const LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('forgot-password', ip, LIMIT, WINDOW_MS)
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
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const bot = await callBot<{ ok: true; token: string }>('/webhook/eyes-account/forgot-password', {
    email,
  })

  // Always return success to prevent email enumeration
  const generic = {
    ok: true,
    message: 'If an account exists for that email, we sent reset instructions.',
  }

  if (!bot.ok) return NextResponse.json(generic)

  const token = (bot.data as { token: string }).token
  await sendPasswordResetEmail(email, token)

  return NextResponse.json(generic)
}

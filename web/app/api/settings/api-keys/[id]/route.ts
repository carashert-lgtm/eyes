import { NextRequest, NextResponse } from 'next/server'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { revokeApiKey } from '@/lib/api-keys/store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 30
const WINDOW_MS = 15 * 60 * 1000

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('api-key-revoke', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const { id } = await context.params
  try {
    const key = await revokeApiKey(identity.accountId, id)
    return NextResponse.json({ ok: true, key })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not revoke key' },
      { status: 400 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { createApiKey, listApiKeys, normalizeScopes } from '@/lib/api-keys/store'
import type { ApiKeyScope } from '@/lib/settings/types'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 20
const WINDOW_MS = 15 * 60 * 1000

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }
  if (!identity.accountId) {
    return NextResponse.json({ error: 'Account ID missing — sign out and sign in again' }, { status: 400 })
  }

  const keys = await listApiKeys(identity.accountId)
  return NextResponse.json({ ok: true, keys })
}

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }
  if (!identity.accountId) {
    return NextResponse.json({ error: 'Account ID missing — sign out and sign in again' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('api-key-create', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { name?: string; scopes?: string[]; kind?: 'personal' | 'team' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 64) {
    return NextResponse.json({ error: 'Key name required (max 64 chars)' }, { status: 400 })
  }

  const existing = await listApiKeys(identity.accountId)
  if (existing.length >= 8) {
    return NextResponse.json({ error: 'Maximum 8 active API keys per account' }, { status: 400 })
  }

  const scopes = normalizeScopes(
    Array.isArray(body.scopes) ? (body.scopes as ApiKeyScope[]) : ['launches:read'],
  )

  try {
    const kind = body.kind === 'team' ? 'team' : 'personal'
    const { record, rawKey } = await createApiKey({
      accountId: identity.accountId,
      email: identity.email,
      name,
      scopes,
      kind,
    })
    return NextResponse.json({
      ok: true,
      key: record,
      rawKey,
      message: 'Copy this key now — it will not be shown again.',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not create API key' },
      { status: 400 },
    )
  }
}

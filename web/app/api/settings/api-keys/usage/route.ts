import { NextResponse } from 'next/server'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { listApiKeyUsage } from '@/lib/api-keys/store'
import { RATE_TIERS } from '@/lib/security/rate-limit-tiers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity?.accountId) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const usage = await listApiKeyUsage(identity.accountId)
  return NextResponse.json({ ok: true, usage, tiers: RATE_TIERS })
}

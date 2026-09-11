import { NextRequest, NextResponse } from 'next/server'
import { getAccountProfile, linkAppAccount } from '@/lib/account-store'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { getTeamSessionFromCookies } from '@/lib/team-auth'
import { normalizeEthAddress } from '@/lib/security/validation'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 20
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in with your Eyes account first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('account-link', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { wallet?: string; linkTeam?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const wallet =
    body.wallet != null
      ? normalizeEthAddress(body.wallet)
      : identity.walletAddress
        ? normalizeEthAddress(identity.walletAddress)
        : null

  let discordId: string | null = null
  if (body.linkTeam !== false) {
    const team = await getTeamSessionFromCookies()
    discordId = team?.discordId ?? null
  }

  if (!wallet && !discordId) {
    return NextResponse.json({ error: 'No wallet or team session to link' }, { status: 400 })
  }

  try {
    const account = await linkAppAccount({ email: identity.email, wallet, discordId })
    const profile = await getAccountProfile({ email: identity.email })

    return NextResponse.json({
      ok: true,
      account,
      profile,
      message: 'Account synced for email updates.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Link failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

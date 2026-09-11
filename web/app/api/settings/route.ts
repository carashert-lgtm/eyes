import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { isLaunchChainKey } from '@/lib/launch-chains/registry'
import {
  getAccountSettings,
  updateAccountSettings,
} from '@/lib/settings/account-settings-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 40
const WINDOW_MS = 15 * 60 * 1000

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const settings = await getAccountSettings(identity.email)
  return NextResponse.json({
    ok: true,
    email: identity.email,
    accountId: identity.accountId,
    walletAddress: identity.walletAddress,
    solanaAddress: identity.solanaAddress,
    settings,
  })
}

export async function PATCH(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('settings-update', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.defaultLaunchChain === 'string' && isLaunchChainKey(body.defaultLaunchChain)) {
    patch.defaultLaunchChain = body.defaultLaunchChain
  }
  if (body.launchWebhookUrl === null || typeof body.launchWebhookUrl === 'string') {
    const url = typeof body.launchWebhookUrl === 'string' ? body.launchWebhookUrl.trim() : ''
    if (url && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Webhook URL must start with https://' }, { status: 400 })
    }
    patch.launchWebhookUrl = url || null
  }
  if (body.launchWebhookSecret === null || typeof body.launchWebhookSecret === 'string') {
    patch.launchWebhookSecret =
      typeof body.launchWebhookSecret === 'string' ? body.launchWebhookSecret.trim() || null : null
  }
  if (typeof body.publicCreatorProfile === 'boolean') {
    patch.publicCreatorProfile = body.publicCreatorProfile
  }
  if (Array.isArray(body.webhookFilterChains)) {
    patch.webhookFilterChains = body.webhookFilterChains.filter(
      (c): c is string => typeof c === 'string' && isLaunchChainKey(c),
    )
  }
  if (typeof body.webhookOnlyMine === 'boolean') patch.webhookOnlyMine = body.webhookOnlyMine
  if (Array.isArray(body.webhookEvents)) patch.webhookEvents = body.webhookEvents
  if (typeof body.walletAutoLockMinutes === 'number') {
    patch.walletAutoLockMinutes = body.walletAutoLockMinutes
  }
  if (typeof body.discordDmLaunches === 'boolean') patch.discordDmLaunches = body.discordDmLaunches
  if (typeof body.discordDmPresale === 'boolean') patch.discordDmPresale = body.discordDmPresale
  if (typeof body.discordDmSeason === 'boolean') patch.discordDmSeason = body.discordDmSeason

  try {
    const settings = await updateAccountSettings(identity.email, patch)
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not save settings' },
      { status: 400 },
    )
  }
}

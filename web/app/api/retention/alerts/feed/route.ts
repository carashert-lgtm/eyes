import { NextRequest, NextResponse } from 'next/server'
import { generateAlertsFromSnapshot, refreshAlertsFromSnapshot } from '@/lib/alerts-generator'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { ALERT_TYPES, EYES_STAKE_TIERS, RETENTION_ENABLED, type StakeTierId } from '@/lib/retention-config'
import { filterAlertsForTier, getRetentionLedger } from '@/lib/retention-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 60
const WINDOW_MS = 60 * 1000

function serializeAlerts(
  alerts: ReturnType<typeof filterAlertsForTier>,
) {
  return alerts.map((a) => ({
    id: a.id,
    type: a.type,
    label: ALERT_TYPES.find((t) => t.id === a.type)?.label ?? a.type,
    launchId: a.launchId,
    title: a.title,
    body: a.body,
    createdAt: a.createdAt,
  }))
}

export async function GET(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, alerts: [] })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-alerts-feed', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const tierId = (request.nextUrl.searchParams.get('tierId') ?? 'scout') as StakeTierId
  const validTier = EYES_STAKE_TIERS.some((t) => t.id === tierId) ? tierId : 'scout'

  try {
    const snapshot = await loadLaunchesSnapshot()
    await refreshAlertsFromSnapshot(snapshot)
    const ledger = await getRetentionLedger()
    const generated = generateAlertsFromSnapshot(snapshot)
    const merged = filterAlertsForTier(
      [...ledger.alerts, ...generated].filter(
        (alert, index, all) => all.findIndex((a) => a.id === alert.id) === index,
      ),
      validTier,
      30,
    )

    return NextResponse.json({
      ok: true,
      enabled: true,
      tierId: validTier,
      alerts: serializeAlerts(merged),
    })
  } catch (err) {
    console.error('[retention/alerts/feed]', err)
    return NextResponse.json(
      { ok: false, error: 'Could not load alerts feed', alerts: [] },
      { status: 500 },
    )
  }
}

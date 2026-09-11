import { NextRequest, NextResponse } from 'next/server'
import { extractApiKey, requireApiKey } from '@/lib/api-keys/auth'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { rankLaunches } from '@/lib/launch-ranking'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const ANON_LIMIT = 120
const KEY_LIMIT = 300
const WINDOW_MS = 60 * 1000

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request)
  const hasKey = Boolean(extractApiKey(request))
  const limited = checkRateLimit(
    hasKey ? 'v1-launch-detail-key' : 'v1-launch-detail',
    hasKey ? extractApiKey(request)! : ip,
    hasKey ? KEY_LIMIT : ANON_LIMIT,
    WINDOW_MS,
  )
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (hasKey) {
    const auth = await requireApiKey(request, 'launches:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, launch: null, apiVersion: '1' })
  }

  const { id } = await context.params
  try {
    const snapshot = await loadLaunchesSnapshot()
    const ranked = rankLaunches(snapshot.launches)
    const launch =
      ranked.find((l) => l.id === id) ??
      ranked.find((l) => String(l.launchId) === id) ??
      null

    if (!launch) {
      return NextResponse.json({ error: 'Launch not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      enabled: true,
      apiVersion: '1',
      authenticated: hasKey,
      updatedAt: snapshot.updatedAt,
      source: snapshot.source,
      launch,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load launch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

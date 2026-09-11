import { NextRequest, NextResponse } from 'next/server'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { rankLaunches } from '@/lib/launch-ranking'
import type { LaunchRecord } from '@/lib/launch-types'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 120
const WINDOW_MS = 60 * 1000

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(_request)
  const limited = checkRateLimit('launch-detail', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, launch: null })
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
      updatedAt: snapshot.updatedAt,
      source: snapshot.source,
      launch,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load launch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { rankLaunches } from '@/lib/launch-ranking'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 60
const WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('rankings', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, rankings: [] })
  }

  const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '10')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10

  try {
    const snapshot = await loadLaunchesSnapshot()
    const ranked = rankLaunches(snapshot.launches).slice(0, limit)

    return NextResponse.json({
      ok: true,
      enabled: true,
      updatedAt: snapshot.updatedAt,
      rankings: ranked.map((r) => ({
        rank: r.rankPosition,
        id: r.id,
        name: r.name,
        symbol: r.symbol,
        phase: r.phase,
        rankScore: Math.round(r.rankScore * 1000) / 1000,
        volumeUsd24h: r.volumeUsd24h,
        trades24h: r.trades24h,
        isBoosted: r.isBoosted,
        boostLabel: r.boost?.label ?? null,
        eyesBurnedTotal: r.eyesBurnedTotal,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rankings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

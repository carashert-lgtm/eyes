import { NextRequest, NextResponse } from 'next/server'
import { RETENTION_ENABLED } from '@/lib/retention-config'
import { getSeasonLeaderboard } from '@/lib/retention-store'
import { getCurrentSeason } from '@/lib/season-utils'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 60
const WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, users: [] })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-leaderboard', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '20')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20
  const season = getCurrentSeason()
  const users = await getSeasonLeaderboard(limit)

  return NextResponse.json({
    ok: true,
    enabled: true,
    season,
    users,
  })
}

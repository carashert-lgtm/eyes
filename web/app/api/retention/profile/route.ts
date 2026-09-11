import { NextRequest, NextResponse } from 'next/server'
import { computeCreatorReputation } from '@/lib/creator-reputation'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { RETENTION_ENABLED } from '@/lib/retention-config'
import { getWalletSeasonPoints } from '@/lib/retention-store'
import { getCurrentSeason } from '@/lib/season-utils'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { normalizeEthAddress } from '@/lib/security/validation'

const LIMIT = 60
const WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-profile', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const wallet = normalizeEthAddress(request.nextUrl.searchParams.get('wallet') ?? '')
  if (!wallet) {
    return NextResponse.json({ error: 'Valid wallet query param required' }, { status: 400 })
  }

  try {
    const snapshot = await loadLaunchesSnapshot()
    const reputation = await computeCreatorReputation(wallet, snapshot)
    const season = getCurrentSeason()
    const seasonPoints = await getWalletSeasonPoints(wallet)

    return NextResponse.json({
      ok: true,
      enabled: true,
      wallet,
      reputation,
      season: {
        ...season,
        points: seasonPoints.points,
        rank: seasonPoints.rank,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Profile lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

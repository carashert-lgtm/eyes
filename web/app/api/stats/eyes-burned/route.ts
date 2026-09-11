import { NextRequest, NextResponse } from 'next/server'
import { fetchEyesBurnStats } from '@/lib/eyes-burn-stats'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 60
const WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('stats-eyes-burned', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  try {
    const stats = await fetchEyesBurnStats()
    if (!stats) {
      return NextResponse.json({ error: 'Burn stats unavailable' }, { status: 503 })
    }
    return NextResponse.json({
      ok: true,
      stats,
      formatted: stats.totalRemoved.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load burn stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { runLaunchIndexerSync } from '@/lib/launch-indexer'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 4
const WINDOW_MS = 60 * 1000

function authorized(request: NextRequest): boolean {
  const secret = process.env.PLATFORM_API_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('x-platform-secret')?.trim()
  return header === secret
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('indexer-sync', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  try {
    const result = await runLaunchIndexerSync()
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Indexed ${result.count} launches`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Indexer sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import {
  filterLaunches,
  rankLaunches,
  sortLaunches,
  type LaunchFilter,
  type LaunchSort,
} from '@/lib/launch-ranking'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 120
const WINDOW_MS = 60 * 1000

const FILTERS = new Set<LaunchFilter>(['all', 'trending', 'new', 'window-open', 'boosted'])
const SORTS = new Set<LaunchSort>(['rank', 'newest', 'volume', 'activity', 'window-ending'])

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('launches-list', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      launches: [],
      total: 0,
    })
  }

  const { searchParams } = request.nextUrl
  const filter = (searchParams.get('filter') ?? 'all') as LaunchFilter
  const sort = (searchParams.get('sort') ?? 'rank') as LaunchSort
  const q = searchParams.get('q') ?? ''
  const limitRaw = Number(searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50

  const safeFilter = FILTERS.has(filter) ? filter : 'all'
  const safeSort = SORTS.has(sort) ? sort : 'rank'

  try {
    const snapshot = await loadLaunchesSnapshot()
    const ranked = rankLaunches(snapshot.launches)
    const filtered = filterLaunches(ranked, safeFilter, q)
    const sorted = sortLaunches(filtered, safeSort).slice(0, limit)

    return NextResponse.json({
      ok: true,
      enabled: true,
      updatedAt: snapshot.updatedAt,
      source: snapshot.source,
      filter: safeFilter,
      sort: safeSort,
      total: filtered.length,
      launches: sorted,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load launches'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

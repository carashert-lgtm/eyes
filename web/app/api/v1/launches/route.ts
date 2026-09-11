import { NextRequest, NextResponse } from 'next/server'
import { extractApiKey, requireApiKey } from '@/lib/api-keys/auth'
import { queryLaunches } from '@/lib/api-v1/launches-query'
import { isLaunchChainKey, type LaunchChainKey } from '@/lib/launch-chains/registry'
import type { LaunchFilter, LaunchSort } from '@/lib/launch-ranking'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { minuteLimitForTier } from '@/lib/security/rate-limit-tiers'

const WINDOW_MS = 60 * 1000

const FILTERS = new Set<LaunchFilter>(['all', 'trending', 'new', 'window-open', 'boosted'])
const SORTS = new Set<LaunchSort>(['rank', 'newest', 'volume', 'activity', 'window-ending'])

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rawKey = extractApiKey(request)
  const hasKey = Boolean(rawKey)
  let rateLimit = minuteLimitForTier('anonymous')
  let bucket = ip

  if (hasKey) {
    const auth = await requireApiKey(request, 'launches:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    rateLimit = minuteLimitForTier(auth.key.tier ?? 'free')
    bucket = auth.key.id
  }

  const limited = checkRateLimit(
    hasKey ? 'v1-launches-key' : 'v1-launches-anon',
    bucket,
    rateLimit,
    WINDOW_MS,
  )
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, launches: [], total: 0, apiVersion: '1' })
  }

  const { searchParams } = request.nextUrl
  const filter = (searchParams.get('filter') ?? 'all') as LaunchFilter
  const sort = (searchParams.get('sort') ?? 'rank') as LaunchSort
  const q = searchParams.get('q') ?? ''
  const chainRaw = searchParams.get('chain')
  const chain =
    chainRaw && isLaunchChainKey(chainRaw) ? (chainRaw as LaunchChainKey) : null
  const limitRaw = Number(searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50

  try {
    const result = await queryLaunches({
      filter: FILTERS.has(filter) ? filter : 'all',
      sort: SORTS.has(sort) ? sort : 'rank',
      q,
      limit,
      chain,
    })

    return NextResponse.json({
      ok: true,
      enabled: true,
      apiVersion: '1',
      authenticated: hasKey,
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load launches'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

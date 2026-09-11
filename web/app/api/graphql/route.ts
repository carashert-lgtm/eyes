import { NextRequest, NextResponse } from 'next/server'
import { extractApiKey, requireApiKey } from '@/lib/api-keys/auth'
import { executeGraphQL } from '@/lib/api-v1/graphql-handler'
import { minuteLimitForTier } from '@/lib/security/rate-limit-tiers'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const hasKey = Boolean(extractApiKey(request))
  let limit = minuteLimitForTier('anonymous')
  let bucket = ip

  if (hasKey) {
    const auth = await requireApiKey(request)
    if (!auth.ok) {
      return NextResponse.json({ errors: [{ message: auth.error }] }, { status: auth.status })
    }
    limit = minuteLimitForTier(auth.key.tier ?? 'free')
    bucket = auth.key.id
  }

  const limited = checkRateLimit('graphql', bucket, limit, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json({ errors: [{ message: body.error }] }, { status, headers })
  }

  let body: { query?: string; variables?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ errors: [{ message: 'Invalid JSON' }] }, { status: 400 })
  }

  try {
    const result = await executeGraphQL(body)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { errors: [{ message: e instanceof Error ? e.message : 'GraphQL error' }] },
      { status: 400 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/graphql',
    example: '{ launches(limit: 5) { id name symbol chainKey } }',
    docs: 'https://www.eyesopen.to/api/v1/docs',
  })
}

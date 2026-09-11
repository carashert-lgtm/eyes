import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api-keys/auth'
import { getEyesAccountById } from '@/lib/eyes-account/store'
import { queryLaunches } from '@/lib/api-v1/launches-query'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import {
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 120
const WINDOW_MS = 60 * 1000

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, 'account:read')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const limited = checkRateLimit('v1-launches-mine', auth.key.id, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, launches: [], total: 0, apiVersion: '1' })
  }

  const account = await getEyesAccountById(auth.key.accountId)
  const wallet = account?.walletAddress?.toLowerCase()
  const solana = account?.solanaAddress

  try {
    const result = await queryLaunches({ limit: 100 })
    const mine = result.launches.filter((launch) => {
      if (wallet && launch.creator.toLowerCase() === wallet) return true
      if (solana && launch.creator === solana) return true
      return false
    })

    return NextResponse.json({
      ok: true,
      enabled: true,
      apiVersion: '1',
      total: mine.length,
      launches: mine,
      walletAddress: account?.walletAddress ?? null,
      solanaAddress: account?.solanaAddress ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load launches'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

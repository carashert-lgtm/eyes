import { NextRequest, NextResponse } from 'next/server'
import { callBot } from '@/lib/bot-webhook'
import { normalizeEthAddress } from '@/lib/security/validation'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 30
const WINDOW_MS = 15 * 60 * 1000

type LinkStatus = {
  linked?: boolean
  discordId?: string
  username?: string
  pendingCode?: string | null
  expiresAt?: string | null
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('wallet-link-code', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { wallet?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = body.wallet ? normalizeEthAddress(body.wallet) : null
  if (!wallet) {
    return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 })
  }

  const result = await callBot<{ code: string; walletAddress: string; expiresAt: string }>(
    '/webhook/wallet/link-code',
    { wallet },
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    code: result.data.code,
    walletAddress: result.data.walletAddress,
    expiresAt: result.data.expiresAt,
    instructions: `In Discord run: !linkwallet ${result.data.code}`,
  })
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  const normalized = wallet ? normalizeEthAddress(wallet) : null
  if (!normalized) {
    return NextResponse.json({ error: 'wallet query required' }, { status: 400 })
  }

  const result = await callBot<{ status: Record<string, unknown> }>(
    '/webhook/wallet/link-status',
    { wallet: normalized },
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const payload = result.data as { status?: LinkStatus }
  return NextResponse.json({ ok: true, ...(payload.status ?? {}) })
}

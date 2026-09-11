import { NextRequest, NextResponse } from 'next/server'
import {
  computeLaunchFeeEyes,
  RETENTION_ENABLED,
  type StakeTierId,
} from '@/lib/retention-config'
import { verifyLaunchFeeAnyTier } from '@/lib/launch-fee-onchain'
import { getRetentionLedger, recordLaunchFee } from '@/lib/retention-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { isValidTxHash, normalizeEthAddress } from '@/lib/security/validation'

const LIMIT = 6
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ error: 'Retention disabled' }, { status: 403 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-launch-fee', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: {
    wallet?: string
    burnTxHash?: string
    treasuryTxHash?: string
    launchTxHash?: string
    tierId?: StakeTierId
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = normalizeEthAddress(body.wallet ?? '')
  const burnTxHash = body.burnTxHash?.trim()
  const treasuryTxHash = body.treasuryTxHash?.trim()
  const launchTxHash = body.launchTxHash?.trim()

  if (!wallet || !burnTxHash) {
    return NextResponse.json(
      { error: 'wallet and burnTxHash are required' },
      { status: 400 },
    )
  }
  if (!isValidTxHash(burnTxHash)) {
    return NextResponse.json({ error: 'Invalid burn transaction hash' }, { status: 400 })
  }
  if (treasuryTxHash && !isValidTxHash(treasuryTxHash)) {
    return NextResponse.json({ error: 'Invalid treasury transaction hash' }, { status: 400 })
  }
  if (launchTxHash && !isValidTxHash(launchTxHash)) {
    return NextResponse.json({ error: 'Invalid launch transaction hash' }, { status: 400 })
  }

  const ledger = await getRetentionLedger()
  const existing = ledger.launchFees.find(
    (f) => f.txHash.toLowerCase() === burnTxHash.toLowerCase(),
  )
  if (existing) {
    return NextResponse.json({
      ok: true,
      fee: existing,
      pricing: computeLaunchFeeEyes(body.tierId ?? 'scout'),
      message: 'Launch fee already registered',
      reused: true,
    })
  }

  try {
    const matched = await verifyLaunchFeeAnyTier(burnTxHash, treasuryTxHash, wallet)

    const record = await recordLaunchFee({
      wallet,
      txHash: burnTxHash,
      eyesSpent: matched.pricing.eyesCost,
      burnAmount: matched.pricing.burnAmount,
      treasuryAmount: matched.pricing.treasuryAmount,
      launchTxHash,
    })

    return NextResponse.json({
      ok: true,
      fee: record,
      pricing: matched.pricing,
      tierId: matched.tierId,
      treasuryTxHash: matched.treasuryTxHash,
      message: 'Launch fee settled in $EYES',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Launch fee verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false })
  }
  const tierId = (request.nextUrl.searchParams.get('tierId') ?? 'scout') as StakeTierId
  const pricing = computeLaunchFeeEyes(tierId)
  return NextResponse.json({ ok: true, enabled: true, pricing })
}

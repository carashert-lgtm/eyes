import { NextRequest, NextResponse } from 'next/server'
import { computeBoostCost, RETENTION_ENABLED } from '@/lib/retention-config'
import { loadLaunchesSnapshot } from '@/lib/launch-data'
import { recordBoost } from '@/lib/retention-store'
import { verifyBoostSettlement } from '@/lib/retention-verify'
import { notifyBoostViaBot } from '@/lib/bot-webhook'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { isValidTxHash, normalizeEthAddress } from '@/lib/security/validation'
import type { StakeTierId } from '@/lib/retention-config'

const LIMIT = 6
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ error: 'Retention disabled' }, { status: 403 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-boost', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: {
    launchId?: string
    packageId?: string
    wallet?: string
    burnTxHash?: string
    treasuryTxHash?: string
    tierId?: StakeTierId
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const wallet = normalizeEthAddress(body.wallet ?? '')
  const launchId = body.launchId?.trim()
  const packageId = body.packageId?.trim()
  const burnTxHash = body.burnTxHash?.trim()
  const treasuryTxHash = body.treasuryTxHash?.trim()
  const tierId = (body.tierId ?? 'scout') as StakeTierId

  if (!wallet || !launchId || !packageId || !burnTxHash) {
    return NextResponse.json(
      { error: 'wallet, launchId, packageId, and burnTxHash are required' },
      { status: 400 },
    )
  }
  if (!isValidTxHash(burnTxHash)) {
    return NextResponse.json({ error: 'Invalid burn transaction hash' }, { status: 400 })
  }
  if (treasuryTxHash && !isValidTxHash(treasuryTxHash)) {
    return NextResponse.json({ error: 'Invalid treasury transaction hash' }, { status: 400 })
  }

  const pricing = computeBoostCost(packageId, tierId)
  if (!pricing) {
    return NextResponse.json({ error: 'Unknown boost package' }, { status: 400 })
  }

  try {
    const snapshot = await loadLaunchesSnapshot()
    const launch = snapshot.launches.find((l) => l.id === launchId)
    if (!launch) {
      return NextResponse.json({ error: 'Launch not found' }, { status: 404 })
    }

    await verifyBoostSettlement(
      burnTxHash,
      treasuryTxHash,
      wallet,
      pricing.burnAmount,
      pricing.treasuryAmount,
    )

    const record = await recordBoost({
      launchId,
      numericLaunchId: launch.launchId,
      packageId,
      wallet,
      txHash: burnTxHash,
      eyesSpent: pricing.eyesCost,
      burnAmount: pricing.burnAmount,
      treasuryAmount: pricing.treasuryAmount,
    })

    void notifyBoostViaBot({
      launchId,
      launchName: launch.name,
      launchSymbol: launch.symbol,
      numericLaunchId: launch.launchId,
      tokenAddress: launch.tokenAddress,
      fomoUrl: launch.fomoUrl,
      packageId,
      packageLabel: pricing.package.label,
      durationHours: pricing.package.durationHours,
      rankMultiplier: record.rankMultiplier,
      eyesSpent: record.eyesSpent,
      burnAmount: record.burnAmount,
      expiresAt: record.expiresAt,
      wallet,
      txHash: burnTxHash,
    }).then((result) => {
      if (!result.ok) {
        console.warn('[boost] Discord notify failed:', result.error)
      }
    })

    return NextResponse.json({
      ok: true,
      boost: record,
      message: `${pricing.package.label} boost active until ${record.expiresAt}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Boost registration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

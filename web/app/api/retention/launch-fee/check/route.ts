import { NextRequest, NextResponse } from 'next/server'
import { computeLaunchFeeEyes, RETENTION_ENABLED } from '@/lib/retention-config'
import { findRecentLaunchFeePair } from '@/lib/launch-fee-onchain'
import {
  getCachedLaunchFeeCheck,
  setCachedLaunchFeeCheck,
} from '@/lib/launch-fee-check-cache'
import { getRetentionLedger } from '@/lib/retention-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { normalizeEthAddress } from '@/lib/security/validation'

const LIMIT = 12
const WINDOW_MS = 15 * 60 * 1000

export async function GET(request: NextRequest) {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('retention-launch-fee-check', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  const wallet = normalizeEthAddress(request.nextUrl.searchParams.get('wallet') ?? '')
  if (!wallet) {
    return NextResponse.json({ error: 'wallet query param required' }, { status: 400 })
  }

  const ledger = await getRetentionLedger()
  const registered = ledger.launchFees.filter((f) => f.wallet.toLowerCase() === wallet)

  try {
    const cached = getCachedLaunchFeeCheck(wallet)
    const onChain =
      cached?.result ??
      (await findRecentLaunchFeePair(wallet).then((result) => {
        setCachedLaunchFeeCheck(wallet, result, Boolean(result))
        return result
      }))

    if (!onChain) {
      return NextResponse.json({
        ok: true,
        wallet,
        paidOnChain: false,
        registered: registered.length > 0,
        registeredFees: registered,
        currentPricing: computeLaunchFeeEyes('scout'),
      })
    }

    const registration = registered.find(
      (f) => f.txHash.toLowerCase() === onChain.burnTxHash.toLowerCase(),
    )
    const alreadyRegistered = Boolean(registration)
    // Reuse when never registered, or registered without a completed launch tx (failed deploy).
    const reusable = !registration?.launchTxHash

    return NextResponse.json({
      ok: true,
      wallet,
      paidOnChain: true,
      alreadyRegistered,
      reusable,
      burnTxHash: onChain.burnTxHash,
      treasuryTxHash: onChain.treasuryTxHash,
      tierId: onChain.tierId,
      pricing: onChain.pricing,
      registeredFees: registered,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not check launch fee'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

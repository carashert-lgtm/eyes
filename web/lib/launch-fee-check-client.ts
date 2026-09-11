export type LaunchFeeCheckResult = {
  ok?: boolean
  error?: string
  paidOnChain?: boolean
  /** Fee was registered in ledger (may still be reusable if launch never completed). */
  alreadyRegistered?: boolean
  /** True when burn can count toward a launch — not consumed by a successful deploy. */
  reusable?: boolean
  burnTxHash?: string
  treasuryTxHash?: string
  tierId?: string
  pricing?: {
    eyesCost: number
    burnAmount: number
    treasuryAmount: number
  }
}

import { readJsonResponse } from '@/lib/fetch-json'

export async function fetchLaunchFeeCheck(wallet: string): Promise<LaunchFeeCheckResult> {
  const res = await fetch(
    `/api/retention/launch-fee/check?wallet=${encodeURIComponent(wallet)}`,
    { credentials: 'same-origin' },
  )
  const data = await readJsonResponse<LaunchFeeCheckResult>(res)
  if (!res.ok) {
    throw new Error(data.error ?? 'Could not verify launch fee status')
  }
  return data
}

/** @deprecated use hasLaunchFeeCredit */
export function hasPaidLaunchFee(
  check: LaunchFeeCheckResult | null | undefined,
): check is LaunchFeeCheckResult & { burnTxHash: string } {
  return hasLaunchFeeCredit(check)
}

/** Prior $EYES burn/treasury txs from a failed launch can be reused — no second payment. */
export function hasLaunchFeeCredit(
  check: LaunchFeeCheckResult | null | undefined,
): check is LaunchFeeCheckResult & { burnTxHash: string } {
  if (!check?.paidOnChain || !check.burnTxHash) return false
  return check.reusable !== false
}

export function isSlowConfirmationError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('slow on base') ||
    lower.includes('taking longer than expected') ||
    lower.includes('timed out while waiting')
  )
}

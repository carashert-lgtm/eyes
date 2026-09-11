import type { Hash } from 'viem'
import {
  fetchLaunchFeeCheck,
  hasLaunchFeeCredit,
  isSlowConfirmationError,
  type LaunchFeeCheckResult,
} from '@/lib/launch-fee-check-client'
import {
  clearPendingLaunchFee,
  loadPendingLaunchFee,
  savePendingLaunchFee,
} from '@/lib/launch-fee-session'
import { readJsonResponse } from '@/lib/fetch-json'
import type { StakeTierId } from '@/lib/retention-config'

export type LaunchFeePricing = {
  eyesCost: number
  burnAmount: number
  treasuryAmount: number
}

export type PaySettlementFn = (amounts: {
  burnAmount: number
  treasuryAmount: number
}) => Promise<{ burnTxHash: Hash; treasuryTxHash: Hash | null }>

type FinalizeLaunchFeeInput = {
  wallet: string
  tierId: StakeTierId
  pricing: LaunchFeePricing
  balance: number
  launchTxHash: string
  paySettlement: PaySettlementFn
  onStatus?: (message: string | null) => void
  refreshCheck?: (wallet: string) => Promise<LaunchFeeCheckResult | null>
}

function pendingAsCheck(wallet: string): LaunchFeeCheckResult | null {
  const pending = loadPendingLaunchFee(wallet)
  if (!pending) return null
  return {
    ok: true,
    paidOnChain: true,
    reusable: true,
    burnTxHash: pending.burnTxHash,
    treasuryTxHash: pending.treasuryTxHash,
  }
}

/** $EYES credit from a prior failed launch — no new payment required. */
export function resolveLaunchFeeCredit(
  check: LaunchFeeCheckResult | null | undefined,
  wallet: string,
): LaunchFeeCheckResult | null {
  if (hasLaunchFeeCredit(check)) return check!
  return pendingAsCheck(wallet)
}

/**
 * Settle $EYES launch fee AFTER on-chain launch succeeds.
 * Failed deploys never reach this — your $EYES stay in wallet.
 */
export async function finalizeLaunchFeeAfterLaunch(input: FinalizeLaunchFeeInput): Promise<void> {
  const { wallet, tierId, pricing, balance, launchTxHash, paySettlement, onStatus, refreshCheck } =
    input

  onStatus?.('Checking launch fee credit…')
  let checkData: LaunchFeeCheckResult | null = null
  try {
    checkData = await fetchLaunchFeeCheck(wallet)
  } catch {
    onStatus?.('Fee scan slow — checking saved session…')
  }

  let burnTxHash: string | undefined
  let treasuryTxHash: string | undefined

  const credit = resolveLaunchFeeCredit(checkData, wallet)
  if (credit?.burnTxHash) {
    burnTxHash = credit.burnTxHash
    treasuryTxHash = credit.treasuryTxHash
    onStatus?.('Reusing $EYES from a previous attempt — registering…')
  } else if (balance >= pricing.eyesCost) {
    onStatus?.('Launch succeeded — confirm $EYES fee settlement…')
    try {
      const txs = await paySettlement({
        burnAmount: pricing.burnAmount,
        treasuryAmount: pricing.treasuryAmount,
      })
      burnTxHash = txs.burnTxHash
      treasuryTxHash = txs.treasuryTxHash ?? undefined
      savePendingLaunchFee({
        wallet,
        burnTxHash,
        treasuryTxHash,
        savedAt: new Date().toISOString(),
      })
    } catch (payErr) {
      const message = payErr instanceof Error ? payErr.message : String(payErr)
      if (isSlowConfirmationError(message) && refreshCheck) {
        onStatus?.('Confirming $EYES fee on-chain…')
        checkData = (await refreshCheck(wallet)) ?? checkData
        const retryCredit = resolveLaunchFeeCredit(checkData, wallet)
        if (retryCredit?.burnTxHash) {
          burnTxHash = retryCredit.burnTxHash
          treasuryTxHash = retryCredit.treasuryTxHash
        } else {
          throw payErr
        }
      } else {
        throw payErr
      }
    }
  } else {
    if (refreshCheck) {
      checkData = (await refreshCheck(wallet)) ?? checkData
    }
    const retryCredit = resolveLaunchFeeCredit(checkData, wallet)
    if (retryCredit?.burnTxHash) {
      burnTxHash = retryCredit.burnTxHash
      treasuryTxHash = retryCredit.treasuryTxHash
    } else {
      throw new Error(
        `Launch is live but $EYES fee settlement failed (${pricing.eyesCost.toLocaleString()} required on Base). ` +
          'Your token deployed — retry fee registration from this page or contact support.',
      )
    }
  }

  if (!burnTxHash) {
    throw new Error('Launch fee settlement could not be completed')
  }

  onStatus?.('Registering launch fee…')
  const feeRes = await fetch('/api/retention/launch-fee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet,
      burnTxHash,
      treasuryTxHash,
      launchTxHash,
      tierId,
    }),
  })
  const feeData = await readJsonResponse<{ error?: string }>(feeRes)
  if (!feeRes.ok) throw new Error(feeData.error ?? 'Launch fee registration failed')

  clearPendingLaunchFee()
}

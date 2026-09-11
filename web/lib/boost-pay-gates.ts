import { hasEnoughEthForGas, MIN_ETH_GAS_FOR_LAUNCH } from '@/lib/wallet-errors'

export type BoostPayGateInput = {
  balance: number
  ethBalance: number
  eyesCost: number | null
  /** First successful balance fetch completed for the current wallet. */
  balanceReady: boolean
  isError: boolean
  hasWallet: boolean
  isConnected: boolean
  hasToken: boolean
}

/** Compare on-chain $EYES balance to settlement cost (tolerates float noise from 18-decimal formatUnits). */
export function hasEnoughEyesBalance(balance: number, eyesCost: number): boolean {
  if (!Number.isFinite(balance) || !Number.isFinite(eyesCost) || eyesCost <= 0) return false
  return balance + 1e-9 >= eyesCost
}

export function getBoostPayGates(input: BoostPayGateInput) {
  const eyesCost = input.eyesCost
  const enoughEyes = eyesCost != null && hasEnoughEyesBalance(input.balance, eyesCost)
  const enoughGas = hasEnoughEthForGas(input.ethBalance)

  const showInsufficientEyes =
    input.hasWallet &&
    input.isConnected &&
    input.balanceReady &&
    !input.isError &&
    eyesCost != null &&
    !enoughEyes

  const canPay =
    input.hasToken &&
    input.hasWallet &&
    input.isConnected &&
    input.balanceReady &&
    !input.isError &&
    eyesCost != null &&
    enoughEyes &&
    enoughGas

  let blockReason: string | null = null
  if (!input.hasToken) blockReason = '$EYES token is not configured'
  else if (!input.hasWallet) blockReason = 'Sign in to pay for boosts'
  else if (!input.isConnected) blockReason = 'Unlock wallet on Profile to pay and boost'
  else if (!input.balanceReady) blockReason = 'Loading balance…'
  else if (input.isError) blockReason = 'Could not load $EYES balance'
  else if (eyesCost == null) blockReason = 'Select a boost package'
  else if (!enoughEyes) {
    blockReason = `Insufficient $EYES balance (${eyesCost.toLocaleString()} required)`
  } else if (!enoughGas) {
    blockReason = `Need at least ${MIN_ETH_GAS_FOR_LAUNCH} ETH on Base for gas`
  }

  return {
    enoughEyes,
    enoughGas,
    showInsufficientEyes,
    canPay,
    blockReason,
  }
}

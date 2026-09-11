import { hasEnoughEthForGas, MIN_ETH_GAS_FOR_LAUNCH } from '@/lib/wallet-errors'
import type { LaunchChainConfig } from '@/lib/launch-chains/registry'

export type DeployGateId =
  | 'sign_in'
  | 'unlock_wallet'
  | 'factory'
  | 'program'
  | 'token_name'
  | 'token_symbol'
  | 'risk_ack'
  | 'eyes_balance'
  | 'eyes_token'
  | 'native_balance'

export type DeployGate = {
  id: DeployGateId
  label: string
  ok: boolean
  hint: string | null
}

/** Solana tx fees + account rent cushion (excluding LP seed). */
export const MIN_SOL_GAS_FOR_LAUNCH = 0.02

export type CreateLaunchGateInput = {
  chain: LaunchChainConfig
  signedIn: boolean
  hasWallet: boolean
  walletUnlocked: boolean
  canSign: boolean
  factoryReady: boolean
  name: string
  symbol: string
  agreed: boolean
  retentionEnabled: boolean
  hasToken: boolean
  eyesFeeCost: number | null
  /** $EYES on Base — same wallet for every launch network. */
  eyesBalance: number
  /** ETH or SOL on the selected launch network. */
  nativeBalance: number
  lpNativeRequired?: number
  launchFeeSatisfied?: boolean
  solanaAddressReady?: boolean
}

export function getCreateLaunchGates(input: CreateLaunchGateInput): {
  gates: DeployGate[]
  ready: boolean
  blockingMessage: string | null
} {
  const symbol = input.symbol.trim().toUpperCase()
  const chain = input.chain
  const needsEyesFee = input.retentionEnabled && input.hasToken && input.eyesFeeCost != null

  const gates: DeployGate[] = [
    {
      id: 'sign_in',
      label: 'Signed in',
      ok: input.signedIn,
      hint: input.signedIn ? null : 'Sign in with your Eyes email and password',
    },
    {
      id: 'unlock_wallet',
      label: 'Wallet unlocked',
      ok: input.hasWallet && input.walletUnlocked && input.canSign,
      hint:
        input.signedIn && input.hasWallet && !input.walletUnlocked
          ? 'Unlock your Eyes wallet using the banner above'
          : null,
    },
  ]

  if (chain.family === 'evm') {
    gates.push({
      id: 'factory',
      label: `${chain.label} launch factory`,
      ok: input.factoryReady && chain.deployEnabled,
      hint:
        chain.deployEnabled && input.factoryReady
          ? null
          : chain.comingSoon
            ? `${chain.label} fair launch deploy is coming soon`
            : `Fair launch deploy opens when the factory is wired on ${chain.label}`,
    })
  } else {
    gates.push({
      id: 'program',
      label: 'Solana launch program',
      ok: chain.deployEnabled && input.solanaAddressReady !== false,
      hint: !chain.deployEnabled
        ? 'Solana fair launch program is being deployed — check back soon'
        : input.solanaAddressReady === false
          ? 'Unlock your Eyes wallet to load your Solana deposit address'
          : null,
    })
  }

  gates.push(
    {
      id: 'token_name',
      label: 'Token name',
      ok: input.name.trim().length > 0,
      hint: input.name.trim().length > 0 ? null : 'Enter a token name',
    },
    {
      id: 'token_symbol',
      label: 'Ticker (2+ chars)',
      ok: symbol.length >= 2,
      hint: symbol.length >= 2 ? null : 'Enter a ticker with at least 2 characters',
    },
    {
      id: 'risk_ack',
      label: 'Risk acknowledgment',
      ok: input.agreed,
      hint: input.agreed ? null : 'Check the risk box before deploying',
    },
  )

  if (needsEyesFee) {
    if (!input.hasToken) {
      gates.push({
        id: 'eyes_token',
        label: '$EYES configured',
        ok: false,
        hint: '$EYES token is not configured in this environment',
      })
    } else {
      const cost = input.eyesFeeCost!
      const feeOk = input.launchFeeSatisfied === true || input.eyesBalance >= cost
      gates.push({
        id: 'eyes_balance',
        label: input.launchFeeSatisfied
          ? 'Launch fee credit available'
          : `${cost.toLocaleString()} $EYES on Base`,
        ok: feeOk,
        hint: feeOk
          ? null
          : `Send ${cost.toLocaleString()} $EYES to your Eyes wallet on Base (same wallet for all networks)`,
      })
    }
  }

  if (input.canSign && (input.factoryReady || chain.deployEnabled || needsEyesFee)) {
    const lp = input.lpNativeRequired ?? 0
    if (chain.family === 'evm') {
      const minNative = MIN_ETH_GAS_FOR_LAUNCH + lp
      const ok = hasEnoughEthForGas(input.nativeBalance, minNative)
      gates.push({
        id: 'native_balance',
        label:
          lp > 0
            ? `${chain.nativeSymbol} on ${chain.label} for gas + LP`
            : `${chain.nativeSymbol} on ${chain.label} for gas`,
        ok,
        hint: ok
          ? null
          : `Send at least ${minNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${chain.nativeSymbol} to your Eyes wallet on ${chain.label} (${MIN_ETH_GAS_FOR_LAUNCH} gas${lp > 0 ? ` + ${lp} LP` : ''})`,
      })
    } else if (chain.deployEnabled || needsEyesFee) {
      const minNative = MIN_SOL_GAS_FOR_LAUNCH + lp
      const ok = input.nativeBalance >= minNative
      gates.push({
        id: 'native_balance',
        label:
          lp > 0
            ? `${chain.nativeSymbol} on ${chain.label} for gas + LP`
            : `${chain.nativeSymbol} on ${chain.label} for gas`,
        ok,
        hint: ok
          ? null
          : `Send at least ${minNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL to your Eyes Solana address on ${chain.label} (${MIN_SOL_GAS_FOR_LAUNCH} gas${lp > 0 ? ` + ${lp} LP` : ''})`,
      })
    }
  }

  const blocking = gates.find((g) => !g.ok)
  return {
    gates,
    ready: !blocking,
    blockingMessage: blocking?.hint ?? blocking?.label ?? null,
  }
}

import { ACTIVE_CHAIN_ID, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'

/** Deployed Base mainnet $EYES — public on-chain address. */
export const BASE_MAINNET_EYES_TOKEN =
  '0xC845770d0f437B93886E152566EE926Aa9153C9e' as const

/** Resolve $EYES token address from env with a safe production fallback. */
export function getEyesTokenAddress(): `0x${string}` | '' {
  const fromEnv =
    process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS?.trim() ||
    process.env.EYES_TOKEN_ADDRESS?.trim() ||
    process.env.EYES_TOKEN?.trim()

  // Base mainnet — always use deployed token (stale Anvil env breaks fee verify)
  if (!IS_LOCAL_ANVIL && ACTIVE_CHAIN_ID === 8453) {
    if (
      fromEnv &&
      fromEnv.toLowerCase() !== BASE_MAINNET_EYES_TOKEN.toLowerCase()
    ) {
      console.warn(
        `[config] Ignoring EYES token env ${fromEnv} on Base mainnet; using ${BASE_MAINNET_EYES_TOKEN}`,
      )
    }
    return BASE_MAINNET_EYES_TOKEN
  }

  if (fromEnv?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return fromEnv as `0x${string}`
  }

  return ''
}

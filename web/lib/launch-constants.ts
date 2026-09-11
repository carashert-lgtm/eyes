/** Half of the default 1B launch supply — paired in Uniswap for FOMO tradability. */
export const DEFAULT_LP_TOKEN_AMOUNT = BigInt(500_000_000) * BigInt(10 ** 18)

export function defaultLpEth(): string {
  return process.env.NEXT_PUBLIC_LAUNCH_DEFAULT_LP_ETH?.trim() || '0.01'
}

/** Below this, FOMO and other apps often block or heavily penalize buys. */
export const FOMO_MIN_LP_ETH = 0.01

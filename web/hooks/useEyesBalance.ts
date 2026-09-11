'use client'

import { useLaunchBalances } from '@/hooks/useLaunchBalances'

/** Base-only balances for profile, boosts, and legacy screens. */
export function useEyesBalance() {
  const result = useLaunchBalances('base')
  return {
    ...result,
    ethBalance: result.nativeBalance,
    ethBalanceFormatted: result.nativeBalanceFormatted,
  }
}

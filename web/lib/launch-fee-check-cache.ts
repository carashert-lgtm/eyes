import type { MatchedLaunchFee } from '@/lib/launch-fee-onchain'

type CacheEntry = {
  expiresAt: number
  result: MatchedLaunchFee | null
  paidOnChain: boolean
}

const CACHE_MS = 45_000
const cache = new Map<string, CacheEntry>()

export function getCachedLaunchFeeCheck(wallet: string): CacheEntry | null {
  const key = wallet.toLowerCase()
  const hit = cache.get(key)
  if (!hit || hit.expiresAt < Date.now()) return null
  return hit
}

export function setCachedLaunchFeeCheck(
  wallet: string,
  result: MatchedLaunchFee | null,
  paidOnChain: boolean,
) {
  cache.set(wallet.toLowerCase(), {
    expiresAt: Date.now() + CACHE_MS,
    result,
    paidOnChain,
  })
}

/** Trading app deep links per launch network. */
export function getFomoTokenUrl(tokenAddress: string, chainKey: 'base' | 'ethereum' | 'solana' = 'base'): string {
  const addr = tokenAddress.trim()
  if (chainKey === 'solana') {
    return `https://dexscreener.com/solana/${addr}`
  }
  if (chainKey === 'ethereum') {
    return `https://dexscreener.com/ethereum/${addr.toLowerCase()}`
  }
  return `https://fomo.family/tokens/base/${addr.toLowerCase()}`
}

export function getDexScreenerUrl(tokenAddress: string, chainKey: 'base' | 'ethereum' | 'solana' = 'base'): string {
  const addr = tokenAddress.trim()
  if (chainKey === 'solana') {
    return `https://dexscreener.com/solana/${addr}`
  }
  if (chainKey === 'ethereum') {
    return `https://dexscreener.com/ethereum/${addr.toLowerCase()}`
  }
  return `https://dexscreener.com/base/${addr.toLowerCase()}`
}

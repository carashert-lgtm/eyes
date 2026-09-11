/**
 * Reliable ERC-20 sends — pending nonce + retry on stale RPC nonce.
 */

export function isNonceError(message) {
  return /nonce.*(too low|lower)|replacement transaction underpriced|already known|nonce too high/i.test(
    message,
  )
}

export function getRpcUrls(primaryRpc) {
  const urls = [
    primaryRpc,
    process.env.BASE_MAINNET_RPC_URL,
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
  ].filter((u) => typeof u === 'string' && u.trim())
  return [...new Set(urls.map((u) => u.trim()))]
}

/** Serial nonce counter for a single distribute/batch run. */
export function createNonceManager(publicClient, address) {
  let nextNonce = null

  return {
    async take(forceRefresh = false) {
      if (nextNonce === null || forceRefresh) {
        nextNonce = await publicClient.getTransactionCount({
          address,
          blockTag: 'pending',
        })
      }
      const nonce = nextNonce
      nextNonce += 1
      return nonce
    },
    reset() {
      nextNonce = null
    },
  }
}

export async function writeContractWithNonceRetry({
  publicClient,
  walletClient,
  account,
  chain,
  nonceManager,
  maxAttempts = 3,
  ...writeParams
}) {
  let lastError
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const nonce = await nonceManager.take(attempt > 0)
      return await walletClient.writeContract({
        ...writeParams,
        account,
        chain,
        nonce,
      })
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      if (!isNonceError(msg) || attempt >= maxAttempts - 1) throw err
      nonceManager.reset()
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

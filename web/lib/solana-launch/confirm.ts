import type { Connection } from '@solana/web3.js'

const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_POLL_MS = 2_000

export function isSolanaBlockhashExpiredError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('block height exceeded') ||
    lower.includes('blockhash not found') ||
    lower.includes('has expired') ||
    lower.includes('transaction was not confirmed')
  )
}

/** Poll signature status — resilient through RPC proxies (no blockhash-bound confirm). */
export async function waitForSolanaSignature(
  connection: Connection,
  signature: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })
    const status = value[0]
    if (status?.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`)
    }
    if (
      status?.confirmationStatus === 'confirmed' ||
      status?.confirmationStatus === 'finalized'
    ) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }

  const { value } = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  })
  const status = value[0]
  if (!status?.err && status?.confirmationStatus) return

  throw new Error(
    `Solana confirmation timed out for ${signature}. Check Solscan — it may still have succeeded.`,
  )
}

/** If confirm threw but we have a signature, check whether it actually landed. */
export async function solanaSignatureSucceeded(
  connection: Connection,
  signature: string,
): Promise<boolean> {
  try {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })
    const status = value[0]
    return Boolean(!status?.err && status?.confirmationStatus)
  } catch {
    return false
  }
}

export function extractSolanaSignature(message: string): string | null {
  const match = message.match(/\b([1-9A-HJ-NP-Za-km-z]{87,88})\b/)
  return match?.[1] ?? null
}

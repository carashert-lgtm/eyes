import { getSolanaRpcUrls } from '@/lib/solana-rpc-urls'

const SOLANA_TIMEOUT_MS = 25_000

/** Explicitly blocked — even for signed-in users. */
const BLOCKED_SOLANA_RPC_METHODS = new Set(['requestAirdrop'])

export type SolanaRpcRelayResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; code?: number }

/**
 * Allow read + tx submit methods used by web3.js, Anchor, and Raydium.
 * Note: Connection.sendRawTransaction() calls JSON-RPC `sendTransaction`, not `sendRawTransaction`.
 */
export function isAllowedSolanaRpcMethod(method: string): boolean {
  if (BLOCKED_SOLANA_RPC_METHODS.has(method)) return false
  if (method === 'sendTransaction' || method === 'simulateTransaction') return true
  if (method.startsWith('get') || method.startsWith('is')) return true
  return false
}

function isRetryableSolanaRpcError(message: string, httpStatus?: number, code?: number): boolean {
  if (httpStatus === 403 || httpStatus === 401 || httpStatus === 429) return true
  if (code === 403 || code === 401 || code === 429) return true

  const lower = message.toLowerCase()
  return (
    lower.includes('access forbidden') ||
    lower.includes('forbidden') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthorized') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('timeout') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('connection reset') ||
    lower.includes('fetch failed')
  )
}

/** Forward a JSON-RPC call across configured Solana endpoints (server-side). */
export async function relaySolanaRpc(
  method: string,
  params: unknown[] = [],
): Promise<SolanaRpcRelayResult> {
  let lastError = 'All Solana RPC endpoints failed'
  let lastCode: number | undefined

  for (const rpc of getSolanaRpcUrls()) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        cache: 'no-store',
        signal: AbortSignal.timeout(SOLANA_TIMEOUT_MS),
      })

      if (!res.ok) {
        lastError = `RPC HTTP ${res.status}`
        if (isRetryableSolanaRpcError(lastError, res.status)) continue
        return { ok: false, error: lastError, code: res.status }
      }

      const json = (await res.json()) as {
        result?: unknown
        error?: { message?: string; code?: number }
      }

      if (json.error) {
        const message = json.error.message ?? 'Solana RPC error'
        lastError = message
        lastCode = json.error.code
        if (isRetryableSolanaRpcError(message, undefined, json.error.code)) continue
        return { ok: false, error: message, code: json.error.code }
      }

      return { ok: true, result: json.result }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Solana RPC request failed'
    }
  }

  return { ok: false, error: lastError, code: lastCode }
}

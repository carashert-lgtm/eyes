import { createPublicClient, http } from 'viem'
import {
  getLaunchEvmChain,
  getLaunchRpcUrls,
  getPublicRpcUrls,
  ACTIVE_WALLET_CHAIN,
  type LaunchEvmChainKey,
} from '@/lib/viem-chain'
import { sanitizeRpcError } from '@/lib/wallet-errors'

const ALLOWED_RPC_METHODS = new Set([
  'eth_chainId',
  'eth_getTransactionCount',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
  'eth_getBlockByNumber',
  'eth_call',
  'eth_sendRawTransaction',
  'eth_getBalance',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
])

export type RpcRelayResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; code?: number }

export function isAllowedWalletRpcMethod(method: string): boolean {
  return ALLOWED_RPC_METHODS.has(method)
}

function isRetryableRpcError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('base_mainnet is not enabled') ||
    lower.includes('not enabled for this app') ||
    lower.includes('invalid api key') ||
    lower.includes('rate limit') ||
    lower.includes('timeout') ||
    lower.includes('temporarily unavailable')
  )
}

function rpcUrlsForChain(chainKey: LaunchEvmChainKey = 'base'): string[] {
  return chainKey === 'base' ? getPublicRpcUrls() : getLaunchRpcUrls(chainKey)
}

/** Forward a JSON-RPC call to configured RPC endpoints (server-side). */
export async function relayWalletRpc(
  method: string,
  params: unknown[] = [],
  chainKey: LaunchEvmChainKey = 'base',
): Promise<RpcRelayResult> {
  let lastError: string | undefined
  let lastCode: number | undefined

  for (const rpc of rpcUrlsForChain(chainKey)) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })

      if (!res.ok) {
        lastError = `RPC HTTP ${res.status}`
        continue
      }

      const json = (await res.json()) as {
        result?: unknown
        error?: { message?: string; code?: number }
      }

      if (json.error) {
        const message = json.error.message ?? 'RPC error'
        lastError = message
        lastCode = json.error.code
        if (isRetryableRpcError(message)) continue
        return { ok: false, error: sanitizeRpcError(message), code: json.error.code }
      }

      return { ok: true, result: json.result }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'RPC request failed'
    }
  }

  return {
    ok: false,
    error: sanitizeRpcError(lastError ?? 'All RPC endpoints failed'),
    code: lastCode,
  }
}

/** Submit a signed transaction using viem (tries each RPC). */
export async function relaySignedTransaction(
  signedTransaction: `0x${string}`,
  chainKey: LaunchEvmChainKey = 'base',
) {
  const chain = chainKey === 'base' ? ACTIVE_WALLET_CHAIN : getLaunchEvmChain(chainKey)
  let lastError: unknown
  for (const rpc of rpcUrlsForChain(chainKey)) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(rpc),
      })
      const hash = await client.sendRawTransaction({ serializedTransaction: signedTransaction })
      return { ok: true as const, hash }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      lastError = e
      if (isRetryableRpcError(message)) continue
    }
  }
  const message = sanitizeRpcError(
    lastError instanceof Error ? lastError.message : 'Broadcast failed',
  )
  return { ok: false as const, error: message }
}

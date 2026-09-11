import { custom, type Transport } from 'viem'
import type { LaunchEvmChainKey } from '@/lib/viem-chain'

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    typeof v === 'bigint' ? `0x${v.toString(16)}` : v,
  )
}

async function walletApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: safeJsonStringify(body),
  })

  let data: { result?: T; hash?: T; error?: string; rpcError?: string }
  try {
    data = (await res.json()) as { result?: T; hash?: T; error?: string; rpcError?: string }
  } catch {
    throw new Error(`Wallet RPC failed (${res.status})`)
  }

  const message = data.rpcError ?? data.error
  if (!res.ok) {
    throw new Error(message ?? `Wallet RPC failed (${res.status})`)
  }

  if (path.includes('/broadcast')) {
    if (data.hash === undefined) throw new Error('Transaction broadcast failed')
    return data.hash
  }

  if (data.result === undefined) throw new Error('Wallet RPC returned no result')
  return data.result
}

/** Browser wallet transport — chain calls go through Eyes API (no direct RPC from browser). */
export function eyesWalletTransport(chainKey: LaunchEvmChainKey = 'base'): Transport {
  return custom({
    async request({ method, params }) {
      if (method === 'eth_sendRawTransaction') {
        return walletApi<string>('/api/wallet/broadcast', {
          signedTransaction: params?.[0],
          chain: chainKey,
        })
      }

      return walletApi<unknown>('/api/wallet/rpc', {
        method,
        params: params ?? [],
        chain: chainKey,
      })
    },
  })
}

import { createPublicClient, formatEther, http, type Address } from 'viem'
import { base, mainnet } from 'viem/chains'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'
import { relaySolanaRpc } from '@/lib/solana-rpc-relay'

function rpcList(envKey: string, fallback: string): string[] {
  const fromEnv = process.env[envKey]?.trim()
  return [fromEnv, fallback].filter((v): v is string => Boolean(v))
}

/** Solana JSON-RPC returns `{ value: lamports }`, not a bare number. */
function parseSolBalanceLamports(result: unknown): number | null {
  if (typeof result === 'number') return result
  if (result && typeof result === 'object' && 'value' in result) {
    const value = (result as { value?: unknown }).value
    if (typeof value === 'number') return value
  }
  return null
}

export async function readNativeBalance(
  chainKey: LaunchChainKey,
  address: string,
): Promise<number> {
  if (chainKey === 'solana') {
    const relay = await relaySolanaRpc('getBalance', [address.trim()])
    if (!relay.ok) throw new Error(relay.error || 'SOL balance lookup failed')
    const lamports = parseSolBalanceLamports(relay.result)
    if (lamports == null) throw new Error('SOL balance lookup failed')
    return lamports / 1_000_000_000
  }

  const evmAddress = address as Address
  if (chainKey === 'ethereum') {
    const rpcs = rpcList('ETHEREUM_MAINNET_RPC_URL', 'https://ethereum.publicnode.com')
    for (const rpc of rpcs) {
      try {
        const client = createPublicClient({ chain: mainnet, transport: http(rpc) })
        const wei = await client.getBalance({ address: evmAddress })
        return Number(formatEther(wei))
      } catch {
        continue
      }
    }
    throw new Error('ETH balance lookup failed on Ethereum')
  }

  const rpcs = rpcList('BASE_MAINNET_RPC_URL', 'https://mainnet.base.org')
  for (const rpc of rpcs) {
    try {
      const client = createPublicClient({ chain: base, transport: http(rpc) })
      const wei = await client.getBalance({ address: evmAddress })
      return Number(formatEther(wei))
    } catch {
      continue
    }
  }
  throw new Error('ETH balance lookup failed on Base')
}

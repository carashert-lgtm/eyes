import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  getAddress,
  http,
  type Hash,
} from 'viem'
import { base } from 'viem/chains'
import { EYES_TOKEN_ABI, EYES_BURN_ADDRESS } from '@/lib/contracts/eyes-token'
import {
  computeLaunchFeeEyes,
  EYES_STAKE_TIERS,
  minLaunchFeeTreasuryAmount,
  type StakeTierId,
} from '@/lib/retention-config'
import { BASE_MAINNET_EYES_TOKEN, getEyesTokenAddress } from '@/lib/eyes-token-config'
import {
  resolveTreasuryTxHash,
  verifyLaunchFeeSettlement,
} from '@/lib/retention-verify'
import { getPublicRpcUrls } from '@/lib/viem-chain'

export type MatchedLaunchFee = {
  tierId: StakeTierId
  pricing: ReturnType<typeof computeLaunchFeeEyes>
  burnTxHash: string
  treasuryTxHash: string | undefined
}

export { minLaunchFeeTreasuryAmount }

export async function verifyLaunchFeeAnyTier(
  burnTxHash: string,
  treasuryTxHash: string | undefined,
  wallet: string,
): Promise<MatchedLaunchFee> {
  let lastError: Error | null = null
  for (const tier of EYES_STAKE_TIERS) {
    const pricing = computeLaunchFeeEyes(tier.id)
    try {
      await verifyLaunchFeeSettlement(
        burnTxHash,
        treasuryTxHash,
        wallet,
        pricing.burnAmount,
        pricing.treasuryAmount,
      )
      const resolvedTreasury = await resolveTreasuryTxHash(
        burnTxHash,
        treasuryTxHash,
        wallet,
        pricing.treasuryAmount,
      )
      return {
        tierId: tier.id,
        pricing,
        burnTxHash,
        treasuryTxHash: resolvedTreasury,
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastError ?? new Error('Launch fee verification failed')
}

function chainClient(rpc: string) {
  return createPublicClient({ chain: base, transport: http(rpc) })
}

const BLOCKSCOUT_TIMEOUT_MS = 4_000
const RPC_SCAN_MAX_BLOCKS = 5_000
const RPC_SCAN_CHUNK = 1_000
const FEE_PAIR_LOOKUP_MS = 6_000

const PUBLIC_INDEXER_RPCS = [
  'https://mainnet.base.org',
  'https://base.publicnode.com',
  'https://base.drpc.org',
  'https://1rpc.io/base',
]

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function burnsFromBlockscout(wallet: string, limit: number): Promise<Hash[]> {
  return withTimeout(burnsFromBlockscoutInner(wallet, limit), BLOCKSCOUT_TIMEOUT_MS, [])
}

async function burnsFromBlockscoutInner(wallet: string, limit: number): Promise<Hash[]> {
  const token = (getEyesTokenAddress() ?? BASE_MAINNET_EYES_TOKEN).toLowerCase()
  const found: Hash[] = []
  let next: string | null =
    `https://base.blockscout.com/api/v2/addresses/${wallet}/token-transfers?token=${token}`

  try {
    while (next && found.length < limit) {
      const res = await fetch(next, { headers: { accept: 'application/json' } })
      if (!res.ok) break
      const text = await res.text()
      if (!text.startsWith('{')) break
      const data = JSON.parse(text) as {
        items?: Array<{
          transaction_hash?: string
          tx_hash?: string
          to?: { hash?: string }
          from?: { hash?: string }
        }>
        next_page_params?: Record<string, string | number>
      }
      for (const item of data.items ?? []) {
        const hash = item.transaction_hash ?? item.tx_hash
        if (!hash) continue
        if (item.to?.hash?.toLowerCase() !== EYES_BURN_ADDRESS.toLowerCase()) continue
        if (item.from?.hash?.toLowerCase() !== wallet.toLowerCase()) continue
        found.push(hash as Hash)
        if (found.length >= limit) break
      }
      if (!data.next_page_params) break
      const params = new URLSearchParams()
      params.set('token', token)
      for (const [k, v] of Object.entries(data.next_page_params)) {
        params.set(k, String(v))
      }
      next = `https://base.blockscout.com/api/v2/addresses/${wallet}/token-transfers?${params}`
    }
    return found
  } catch {
    return found
  }
}

async function recentBurnTxHashes(wallet: string, limit = 12): Promise<Hash[]> {
  const blockscout = await burnsFromBlockscout(wallet, limit)
  if (blockscout.length > 0) return blockscout

  const token = getAddress(getEyesTokenAddress() ?? BASE_MAINNET_EYES_TOKEN)
  const from = getAddress(wallet)
  const transferEvent = {
    type: 'event' as const,
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  }

  for (const rpc of PUBLIC_INDEXER_RPCS) {
    try {
      const client = chainClient(rpc)
      const latest = await client.getBlockNumber()
      const fromBlock =
        latest > BigInt(RPC_SCAN_MAX_BLOCKS) ? latest - BigInt(RPC_SCAN_MAX_BLOCKS) : BigInt(0)
      const found: Hash[] = []
      const chunk = BigInt(RPC_SCAN_CHUNK)

      for (let start = latest; start >= fromBlock && found.length < limit; start -= chunk) {
        const end = start
        const begin =
          start - chunk + BigInt(1) < fromBlock ? fromBlock : start - chunk + BigInt(1)
        try {
          const logs = await client.getLogs({
            address: token,
            event: transferEvent,
            args: { from },
            fromBlock: begin,
            toBlock: end,
          })
          for (let i = logs.length - 1; i >= 0; i--) {
            const log = logs[i]
            const args = log.args as { to?: string }
            if (!args.to) continue
            const to = getAddress(args.to)
            if (to.toLowerCase() !== EYES_BURN_ADDRESS.toLowerCase()) continue
            const hash = log.transactionHash
            if (!found.some((h) => h.toLowerCase() === hash.toLowerCase())) {
              found.push(hash)
            }
            if (found.length >= limit) break
          }
        } catch {
          continue
        }
      }
      if (found.length > 0) return found
    } catch {
      continue
    }
  }
  return []
}

/** Find a recent on-chain burn + treasury pair that satisfies any launch fee tier. */
export async function findRecentLaunchFeePair(wallet: string): Promise<MatchedLaunchFee | null> {
  return withTimeout(findRecentLaunchFeePairInner(wallet), FEE_PAIR_LOOKUP_MS, null)
}

async function findRecentLaunchFeePairInner(wallet: string): Promise<MatchedLaunchFee | null> {
  const burns = await recentBurnTxHashes(wallet)
  for (const burnTxHash of burns) {
    try {
      return await verifyLaunchFeeAnyTier(burnTxHash, undefined, wallet)
    } catch {
      continue
    }
  }
  return null
}

export async function readBurnAmountFromTx(burnTxHash: string): Promise<number | null> {
  const token = getAddress(getEyesTokenAddress() ?? BASE_MAINNET_EYES_TOKEN)
  for (const rpc of getPublicRpcUrls()) {
    try {
      const client = chainClient(rpc)
      const receipt = await client.getTransactionReceipt({ hash: burnTxHash as Hash })
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== token.toLowerCase()) continue
        try {
          const decoded = decodeEventLog({
            abi: EYES_TOKEN_ABI,
            data: log.data,
            topics: log.topics,
            strict: false,
          })
          if (decoded.eventName !== 'Transfer') continue
          const args = decoded.args as { to: `0x${string}`; value: bigint }
          if (args.to.toLowerCase() !== EYES_BURN_ADDRESS.toLowerCase()) continue
          return Number(formatUnits(args.value, 18))
        } catch {
          continue
        }
      }
      return null
    } catch {
      continue
    }
  }
  return null
}

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  parseAbiItem,
  type PublicClient,
} from 'viem'
import { base, baseSepolia, mainnet } from 'viem/chains'
import { ANVIL_RPC_URL, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'
import { LAUNCH_FACTORY_ABI } from '@/lib/contracts/launch-factory'
import { getFomoTokenUrl } from '@/lib/fomo-links'
import { getLaunchMetadataMap } from '@/lib/launch-metadata-store'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'
import type { LaunchPhase, LaunchRecord, LaunchesSnapshot } from '@/lib/launch-types'
import { syncSolanaLaunches } from '@/lib/solana-launch/indexer'
import { setCachedLaunchesSnapshot } from '@/lib/launch-snapshot-cache'
import { CONTRACTS } from '@/lib/site-config'
import { getLaunchRpcUrls } from '@/lib/viem-chain'

const PHASES: LaunchPhase[] = ['Pending', 'EyesWindow', 'Trading']

type LaunchInfo = {
  token: `0x${string}`
  creator: `0x${string}`
  pair: `0x${string}`
  eyesWindowStart: bigint
  eyesWindowEnd: bigint
  phase: number
  liquidityLocked: boolean
}

const ERC20_META_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

type IndexerClient = PublicClient

function getClientForChain(chainKey: LaunchChainKey): IndexerClient | null {
  if (IS_LOCAL_ANVIL) {
    if (chainKey !== 'base') return null
    const anvil = defineChain({
      id: 31_337,
      name: 'Anvil Local',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [ANVIL_RPC_URL] } },
    })
    return createPublicClient({ chain: anvil, transport: http(ANVIL_RPC_URL) }) as IndexerClient
  }

  if (chainKey === 'ethereum') {
    const factory = process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim()
    if (!factory) return null
    const rpc = getLaunchRpcUrls('ethereum')[0]
    return createPublicClient({ chain: mainnet, transport: http(rpc) }) as IndexerClient
  }

  if (chainKey === 'base') {
    if (APP_ENV === 'production') {
      const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
      return createPublicClient({ chain: base, transport: http(rpc) }) as IndexerClient
    }
    const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
    return createPublicClient({ chain: baseSepolia, transport: http(rpc) }) as IndexerClient
  }

  return null
}

function factoryAddress(chainKey: LaunchChainKey): `0x${string}` | null {
  const raw =
    chainKey === 'ethereum'
      ? process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim()
      : CONTRACTS.launchFactory
  if (!raw) return null
  try {
    return getAddress(raw)
  } catch {
    return null
  }
}

function mapLaunch(
  chainKey: LaunchChainKey,
  launchId: number,
  info: LaunchInfo,
  createdAt: string,
  overrides?: Partial<LaunchRecord>,
): LaunchRecord {
  const phase = PHASES[Number(info.phase)] ?? 'Pending'
  const pair = info.pair
  const hasPair = pair !== '0x0000000000000000000000000000000000000000'
  const base: LaunchRecord = {
    id: `${chainKey}-launch-${launchId}`,
    launchId,
    chainKey,
    name: `Launch #${launchId}`,
    symbol: `L${launchId}`,
    creator: info.creator,
    tokenAddress: info.token,
    pairAddress: hasPair ? pair : undefined,
    phase,
    eyesWindowStart: new Date(Number(info.eyesWindowStart) * 1000).toISOString(),
    eyesWindowEnd: new Date(Number(info.eyesWindowEnd) * 1000).toISOString(),
    lpLocked: info.liquidityLocked,
    volumeUsd24h: 0,
    trades24h: 0,
    feesEth24h: 0,
    eyesBurnedTotal: 0,
    boost: null,
    createdAt,
    updatedAt: new Date().toISOString(),
  }
  const merged = { ...base, ...overrides }
  if (hasPair && info.liquidityLocked && !merged.fomoUrl) {
    merged.fomoUrl = getFomoTokenUrl(info.token, chainKey === 'ethereum' ? 'ethereum' : 'base')
  }
  return merged
}

async function syncFactoryLaunches(
  chainKey: LaunchChainKey,
  client: IndexerClient,
  factory: `0x${string}`,
): Promise<LaunchRecord[]> {
  const count = Number(
    await client.readContract({
      address: factory,
      abi: LAUNCH_FACTORY_ABI,
      functionName: 'launchCount',
    }),
  )

  const createdAtById = new Map<number, string>()
  try {
    const logs = await client.getLogs({
      address: factory,
      event: parseAbiItem(
        'event LaunchCreated(uint256 indexed launchId, address indexed token, address indexed creator, uint64 eyesWindowStart, uint64 eyesWindowEnd)',
      ),
      fromBlock: BigInt(0),
      toBlock: 'latest',
    })
    for (const log of logs) {
      const launchId = Number(log.args.launchId)
      const block = await client.getBlock({ blockNumber: log.blockNumber })
      createdAtById.set(launchId, new Date(Number(block.timestamp) * 1000).toISOString())
    }
  } catch {
    // RPC may restrict wide log scans — fall back to now for createdAt
  }

  const metadataByToken = await getLaunchMetadataMap()
  const launches: LaunchRecord[] = []

  for (let id = 1; id <= count; id++) {
    const info = await client.readContract({
      address: factory,
      abi: LAUNCH_FACTORY_ABI,
      functionName: 'getLaunch',
      args: [BigInt(id)],
    })
    if (info.token === '0x0000000000000000000000000000000000000000') continue

    let name: string | undefined
    let symbol: string | undefined
    try {
      ;[name, symbol] = await Promise.all([
        client.readContract({
          address: info.token,
          abi: ERC20_META_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address: info.token,
          abi: ERC20_META_ABI,
          functionName: 'symbol',
        }),
      ])
    } catch {
      // Non-standard token metadata — use fallbacks
    }

    const meta =
      metadataByToken.get(`${chainKey}:${info.token.toLowerCase()}`) ??
      metadataByToken.get(`${chainKey}:id:${id}`) ??
      metadataByToken.get(info.token.toLowerCase()) ??
      metadataByToken.get(`id:${id}`)

    launches.push(
      mapLaunch(chainKey, id, info, createdAtById.get(id) ?? new Date().toISOString(), {
        name: meta?.name ?? name ?? `Launch #${id}`,
        symbol: meta?.symbol ?? symbol ?? `L${id}`,
        description: meta?.description,
        website: meta?.website,
        twitter: meta?.twitter,
        telegram: meta?.telegram,
        fomoUrl: meta?.fomoUrl,
      }),
    )
  }

  return launches
}

export async function syncLaunchesFromChain(): Promise<LaunchesSnapshot> {
  const chainKeys: LaunchChainKey[] = IS_LOCAL_ANVIL ? ['base'] : ['base', 'ethereum']
  const launches: LaunchRecord[] = []
  let syncedAny = false
  const metadataByToken = await getLaunchMetadataMap()

  for (const chainKey of chainKeys) {
    const factory = factoryAddress(chainKey)
    const client = getClientForChain(chainKey)
    if (!factory || !client) continue

    try {
      const chainLaunches = await syncFactoryLaunches(chainKey, client, factory)
      launches.push(...chainLaunches)
      syncedAny = true
    } catch (err) {
      console.warn(`[launch-indexer] ${chainKey} sync failed`, err)
    }
  }

  if (!IS_LOCAL_ANVIL) {
    try {
      const solanaLaunches = await syncSolanaLaunches(metadataByToken)
      if (solanaLaunches.length > 0) {
        launches.push(...solanaLaunches)
        syncedAny = true
      }
    } catch (err) {
      console.warn('[launch-indexer] solana sync failed', err)
    }
  }

  if (!syncedAny && !IS_LOCAL_ANVIL) {
    const baseFactory = factoryAddress('base')
    if (baseFactory) {
      throw new Error('Launch factory address is configured but chain sync failed')
    }
    throw new Error('Launch factory address is not configured')
  }

  launches.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return {
    updatedAt: new Date().toISOString(),
    source: 'indexer',
    launches,
  }
}

export async function writeLaunchesSnapshot(snapshot: LaunchesSnapshot): Promise<string> {
  const target =
    process.env.LAUNCHES_SNAPSHOT_PATH ??
    path.join(process.cwd(), 'data', 'launches-snapshot.json')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(snapshot, null, 2), 'utf-8')
  return target
}

export async function runLaunchIndexerSync(): Promise<{ path: string; count: number }> {
  const snapshot = await syncLaunchesFromChain()
  setCachedLaunchesSnapshot(snapshot)

  try {
    const out = await writeLaunchesSnapshot(snapshot)
    return { path: out, count: snapshot.launches.length }
  } catch {
    return { path: 'memory', count: snapshot.launches.length }
  }
}

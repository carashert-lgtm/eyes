import { PublicKey } from '@solana/web3.js'
import { getFomoTokenUrl } from '@/lib/fomo-links'
import type { LaunchMetadataRecord } from '@/lib/launch-metadata-store'
import type { LaunchPhase, LaunchRecord } from '@/lib/launch-types'
import { createSolanaConnection } from '@/lib/solana-rpc'
import {
  deriveFactoryPda,
  deriveLaunchPda,
  fetchFactoryState,
  getSolanaLaunchProgramId,
} from '@/lib/solana-launch/factory-client'

const PHASES: LaunchPhase[] = ['Pending', 'EyesWindow', 'Trading']
const ZERO_PUBKEY = PublicKey.default.toBase58()

export type DecodedLaunchAccount = {
  launchId: bigint
  creator: string
  mint: string
  pair: string
  name: string
  symbol: string
  eyesWindowStart: bigint
  eyesWindowEnd: bigint
  phase: number
  liquidityLocked: boolean
}

/** Decode Anchor `Launch` account data (8-byte discriminator + struct). */
export function decodeLaunchAccount(data: Buffer): DecodedLaunchAccount | null {
  if (data.length < 8 + 8 + 32 + 32 + 32 + 4 + 4 + 8 + 8 + 1 + 1 + 1) return null

  let offset = 8
  const launchId = data.readBigUInt64LE(offset)
  offset += 8
  const creator = new PublicKey(data.subarray(offset, offset + 32)).toBase58()
  offset += 32
  const mint = new PublicKey(data.subarray(offset, offset + 32)).toBase58()
  offset += 32
  const pair = new PublicKey(data.subarray(offset, offset + 32)).toBase58()
  offset += 32

  const nameLen = data.readUInt32LE(offset)
  offset += 4
  if (offset + nameLen > data.length) return null
  const name = data.subarray(offset, offset + nameLen).toString('utf8')
  offset += nameLen

  const symbolLen = data.readUInt32LE(offset)
  offset += 4
  if (offset + symbolLen > data.length) return null
  const symbol = data.subarray(offset, offset + symbolLen).toString('utf8')
  offset += symbolLen

  if (offset + 8 + 8 + 1 + 1 + 1 > data.length) return null
  const eyesWindowStart = data.readBigInt64LE(offset)
  offset += 8
  const eyesWindowEnd = data.readBigInt64LE(offset)
  offset += 8
  const phase = data[offset]
  offset += 1
  const liquidityLocked = data[offset] === 1

  return {
    launchId,
    creator,
    mint,
    pair,
    name,
    symbol,
    eyesWindowStart,
    eyesWindowEnd,
    phase,
    liquidityLocked,
  }
}

function mapSolanaLaunch(
  launchId: number,
  info: DecodedLaunchAccount,
  metadata?: LaunchMetadataRecord,
): LaunchRecord {
  const phase = PHASES[info.phase] ?? 'Pending'
  const hasPair = info.pair !== ZERO_PUBKEY
  const createdAt = new Date(Number(info.eyesWindowStart) * 1000).toISOString()

  const record: LaunchRecord = {
    id: `solana-launch-${launchId}`,
    launchId,
    chainKey: 'solana',
    name: metadata?.name ?? (info.name || `Launch #${launchId}`),
    symbol: metadata?.symbol ?? (info.symbol || `L${launchId}`),
    creator: info.creator,
    tokenAddress: info.mint,
    pairAddress: hasPair ? info.pair : undefined,
    phase,
    eyesWindowStart: new Date(Number(info.eyesWindowStart) * 1000).toISOString(),
    eyesWindowEnd: new Date(Number(info.eyesWindowEnd) * 1000).toISOString(),
    lpLocked: info.liquidityLocked,
    volumeUsd24h: 0,
    trades24h: 0,
    feesEth24h: 0,
    eyesBurnedTotal: 0,
    boost: null,
    description: metadata?.description,
    website: metadata?.website,
    twitter: metadata?.twitter,
    telegram: metadata?.telegram,
    createdAt,
    updatedAt: new Date().toISOString(),
  }

  if (!record.fomoUrl) {
    record.fomoUrl = metadata?.fomoUrl ?? getFomoTokenUrl(info.mint, 'solana')
  }

  return record
}

export async function syncSolanaLaunches(
  metadataByKey: Map<string, LaunchMetadataRecord>,
): Promise<LaunchRecord[]> {
  if (!process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim()) return []

  const connection = createSolanaConnection()
  const factoryState = await fetchFactoryState(connection)
  if (!factoryState || factoryState.launchCount <= BigInt(0)) return []

  const programId = getSolanaLaunchProgramId()
  const [factory] = deriveFactoryPda(programId)
  const count = Number(factoryState.launchCount)
  const launches: LaunchRecord[] = []

  for (let id = 1; id <= count; id++) {
    const [launchPda] = deriveLaunchPda(programId, factory, BigInt(id))
    const account = await connection.getAccountInfo(launchPda)
    if (!account?.data) continue

    const info = decodeLaunchAccount(Buffer.from(account.data))
    if (!info || info.mint === ZERO_PUBKEY) continue

    const meta =
      metadataByKey.get(`solana:${info.mint}`) ??
      metadataByKey.get(`solana:id:${id}`) ??
      metadataByKey.get(info.mint)

    launches.push(mapSolanaLaunch(id, info, meta))
  }

  return launches
}

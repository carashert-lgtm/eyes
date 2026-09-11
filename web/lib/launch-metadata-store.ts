import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { callBot } from '@/lib/bot-webhook'

export type LaunchMetadataRecord = {
  launchId: number
  chainKey: 'base' | 'ethereum' | 'solana'
  tokenAddress: string
  pairAddress?: string | null
  name: string
  symbol: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  creator: string
  deployTxHash?: string
  seedTxHash?: string
  fomoUrl: string
  registeredAt: string
}

const LOCAL_PATH = path.join(process.cwd(), 'data', 'launch-metadata.json')

function canUseLocalStore(): boolean {
  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

type LocalStore = { records: LaunchMetadataRecord[]; updatedAt: string }

function readLocal(): LocalStore {
  if (!existsSync(LOCAL_PATH)) return { records: [], updatedAt: new Date(0).toISOString() }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, 'utf-8')) as LocalStore
  } catch {
    return { records: [], updatedAt: new Date(0).toISOString() }
  }
}

function writeLocal(store: LocalStore) {
  mkdirSync(path.dirname(LOCAL_PATH), { recursive: true })
  store.updatedAt = new Date().toISOString()
  writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export async function registerLaunchMetadata(
  input: Omit<LaunchMetadataRecord, 'registeredAt'>,
): Promise<LaunchMetadataRecord> {
  const record: LaunchMetadataRecord = {
    ...input,
    chainKey: input.chainKey ?? 'base',
    tokenAddress:
      input.chainKey === 'solana'
        ? input.tokenAddress.trim()
        : input.tokenAddress.toLowerCase(),
    registeredAt: new Date().toISOString(),
  }

  const bot = await callBot<{ ok: true; record: LaunchMetadataRecord }>(
    '/webhook/launch/register',
    record,
  )
  if (bot.ok) return (bot.data as { record: LaunchMetadataRecord }).record

  if (!canUseLocalStore()) {
    throw new Error(bot.error || 'Could not save launch metadata — activation service unavailable')
  }

  const store = readLocal()
  const idx = store.records.findIndex(
    (r) => r.tokenAddress === record.tokenAddress || r.launchId === record.launchId,
  )
  if (idx >= 0) store.records[idx] = record
  else store.records.push(record)
  writeLocal(store)
  return record
}

export async function getLaunchMetadataMap(): Promise<Map<string, LaunchMetadataRecord>> {
  const bot = await callBot<{ ok: true; records: LaunchMetadataRecord[] }>(
    '/webhook/launch/list',
    {},
  )
  const records = bot.ok
    ? (bot.data as { records: LaunchMetadataRecord[] }).records
    : canUseLocalStore()
      ? readLocal().records
      : []

  const map = new Map<string, LaunchMetadataRecord>()
  for (const row of records) {
    const chainKey = row.chainKey ?? 'base'
    const tokenKey =
      chainKey === 'solana' ? row.tokenAddress.trim() : row.tokenAddress.toLowerCase()

    map.set(`${chainKey}:${tokenKey}`, row)
    map.set(`${chainKey}:id:${row.launchId}`, row)

    // Legacy keys for EVM indexer lookups
    if (chainKey !== 'solana') {
      map.set(tokenKey, row)
      map.set(`id:${row.launchId}`, row)
    }
  }
  return map
}

import { readFile } from 'fs/promises'
import path from 'path'
import { TEAM_POOL } from '@/lib/platform-config'
import {
  EMPTY_POOL_SNAPSHOT,
  aggregatePoolFromUsers,
  type PoolSnapshot,
} from '@/lib/pool-types'

const SNAPSHOT_CANDIDATES = [
  process.env.PLATFORM_SNAPSHOT_PATH,
  path.join(process.cwd(), 'data', 'platform-snapshot.json'),
  path.join(process.cwd(), '..', 'data', 'platform-snapshot.json'),
].filter((p): p is string => Boolean(p))

async function readSnapshotFile(): Promise<PoolSnapshot | null> {
  for (const candidate of SNAPSHOT_CANDIDATES) {
    try {
      const raw = await readFile(candidate, 'utf-8')
      const data = JSON.parse(raw) as PoolSnapshot
      if (data.pool && data.users) return data
    } catch {
      continue
    }
  }
  return null
}

export async function loadPoolSnapshot(): Promise<PoolSnapshot> {
  const data = await readSnapshotFile()
  if (data) return data
  return getDefaultSnapshot()
}

function getDefaultSnapshot(): PoolSnapshot {
  const snap = { ...EMPTY_POOL_SNAPSHOT, updatedAt: new Date().toISOString() }
  snap.pool = aggregatePoolFromUsers([], TEAM_POOL.totalTokens)
  snap.pool.total = TEAM_POOL.totalTokens
  snap.pool.remaining = TEAM_POOL.totalTokens
  return snap
}

export function findUserInSnapshot(
  snapshot: PoolSnapshot,
  opts: { discordId?: string; referralCode?: string; wallet?: string },
) {
  return snapshot.users.find((u) => {
    if (opts.discordId && u.discordId === opts.discordId) return true
    if (opts.referralCode && u.referralCode === opts.referralCode) return true
    if (opts.wallet && u.walletAddress?.toLowerCase() === opts.wallet.toLowerCase())
      return true
    return false
  })
}

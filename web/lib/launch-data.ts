import { readFile } from 'fs/promises'
import path from 'path'
import { refreshAlertsFromSnapshot } from '@/lib/alerts-generator'
import { syncLaunchesFromChain } from '@/lib/launch-indexer'
import {
  getCachedLaunchesSnapshot,
  setCachedLaunchesSnapshot,
} from '@/lib/launch-snapshot-cache'
import { mergeBoostsIntoLaunches } from '@/lib/retention-store'
import { APP_ENV } from '@/lib/chain-config'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import { isLaunchChainKey } from '@/lib/launch-chains/registry'
import { EMPTY_LAUNCHES_SNAPSHOT, type LaunchesSnapshot, type LaunchRecord } from '@/lib/launch-types'

const SNAPSHOT_CANDIDATES = [
  process.env.LAUNCHES_SNAPSHOT_PATH,
  path.join(process.cwd(), 'data', 'launches-snapshot.json'),
  path.join(process.cwd(), '..', 'data', 'launches-snapshot.json'),
].filter((p): p is string => Boolean(p))

/** Local dev only — production/Vercel always reads the live factory. */
function shouldUseLocalSnapshotFile() {
  if (process.env.VERCEL === '1') return false
  if (APP_ENV === 'production') return false
  return true
}

function normalizeLaunchRecord(launch: LaunchRecord): LaunchRecord {
  const raw = launch.chainKey ?? ''
  const chainKey = isLaunchChainKey(raw) ? raw : 'base'
  return chainKey === launch.chainKey ? launch : { ...launch, chainKey }
}

async function readSnapshotFile(): Promise<LaunchesSnapshot | null> {
  for (const candidate of SNAPSHOT_CANDIDATES) {
    try {
      const raw = await readFile(candidate, 'utf-8')
      const data = JSON.parse(raw) as LaunchesSnapshot
      if (Array.isArray(data.launches)) {
        return {
          ...data,
          source: 'indexer',
          launches: data.launches.map((launch) => normalizeLaunchRecord(launch)),
        }
      }
    } catch {
      continue
    }
  }
  return null
}

function emptyIndexerSnapshot(): LaunchesSnapshot {
  return {
    ...EMPTY_LAUNCHES_SNAPSHOT,
    updatedAt: new Date().toISOString(),
    source: 'indexer',
  }
}

/** Live factory reads — never falls back to bundled demo launches. */
async function loadFromChain(): Promise<LaunchesSnapshot> {
  const cached = getCachedLaunchesSnapshot()
  if (cached) return cached

  try {
    const snapshot = await syncLaunchesFromChain()
    setCachedLaunchesSnapshot(snapshot)
    return snapshot
  } catch (err) {
    console.warn('[launch-data] chain sync unavailable', err)
    return emptyIndexerSnapshot()
  }
}

export async function loadLaunchesSnapshot(options?: {
  refreshAlerts?: boolean
}): Promise<LaunchesSnapshot> {
  if (!DISCOVERY_ENABLED) {
    return emptyIndexerSnapshot()
  }

  const data =
    (shouldUseLocalSnapshotFile() ? await readSnapshotFile() : null) ??
    (await loadFromChain())
  const merged = {
    ...data,
    launches: await mergeBoostsIntoLaunches(data.launches),
  }
  if (options?.refreshAlerts) {
    await refreshAlertsFromSnapshot(merged)
  }
  return merged
}

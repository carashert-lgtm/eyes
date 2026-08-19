import { readFile } from 'fs/promises'
import path from 'path'
import { DISCOVERY_ENABLED } from '@/lib/retention-config'
import { EMPTY_LAUNCHES_SNAPSHOT, type LaunchesSnapshot } from '@/lib/launch-types'

const SNAPSHOT_CANDIDATES = [
  process.env.LAUNCHES_SNAPSHOT_PATH,
  path.join(process.cwd(), 'data', 'launches-snapshot.json'),
  path.join(process.cwd(), '..', 'data', 'launches-snapshot.json'),
].filter((p): p is string => Boolean(p))

async function readSnapshotFile(): Promise<LaunchesSnapshot | null> {
  for (const candidate of SNAPSHOT_CANDIDATES) {
    try {
      const raw = await readFile(candidate, 'utf-8')
      const data = JSON.parse(raw) as LaunchesSnapshot
      if (Array.isArray(data.launches)) return data
    } catch {
      continue
    }
  }
  return null
}

export async function loadLaunchesSnapshot(): Promise<LaunchesSnapshot> {
  if (!DISCOVERY_ENABLED) {
    return { ...EMPTY_LAUNCHES_SNAPSHOT, updatedAt: new Date().toISOString() }
  }
  const data = await readSnapshotFile()
  if (data) return data
  return { ...EMPTY_LAUNCHES_SNAPSHOT, updatedAt: new Date().toISOString() }
}

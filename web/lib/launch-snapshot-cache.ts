import type { LaunchesSnapshot } from '@/lib/launch-types'

/** Short TTL — serverless instances refresh from chain without hammering RPC. */
export const LAUNCH_SNAPSHOT_CACHE_MS = 60_000

let cached: LaunchesSnapshot | null = null
let cachedAt = 0

export function getCachedLaunchesSnapshot(
  maxAgeMs = LAUNCH_SNAPSHOT_CACHE_MS,
): LaunchesSnapshot | null {
  if (!cached) return null
  if (Date.now() - cachedAt > maxAgeMs) return null
  return cached
}

export function setCachedLaunchesSnapshot(snapshot: LaunchesSnapshot) {
  cached = snapshot
  cachedAt = Date.now()
}

export function clearCachedLaunchesSnapshot() {
  cached = null
  cachedAt = 0
}

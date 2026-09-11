import { loadLaunchesSnapshot } from '@/lib/launch-data'
import {
  filterLaunches,
  rankLaunches,
  sortLaunches,
  type LaunchFilter,
  type LaunchSort,
} from '@/lib/launch-ranking'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'
import { isLaunchChainKey } from '@/lib/launch-chains/registry'

export async function queryLaunches(input: {
  filter?: LaunchFilter
  sort?: LaunchSort
  q?: string
  limit?: number
  chain?: LaunchChainKey | null
}) {
  const filter = input.filter ?? 'all'
  const sort = input.sort ?? 'rank'
  const q = input.q ?? ''
  const limit = input.limit ?? 50

  const snapshot = await loadLaunchesSnapshot()
  let ranked = rankLaunches(snapshot.launches)

  if (input.chain && isLaunchChainKey(input.chain)) {
    ranked = ranked.filter((l) => l.chainKey === input.chain)
  }

  const filtered = filterLaunches(ranked, filter, q)
  const sorted = sortLaunches(filtered, sort).slice(0, limit)

  return {
    updatedAt: snapshot.updatedAt,
    source: snapshot.source,
    filter,
    sort,
    chain: input.chain ?? null,
    total: filtered.length,
    launches: sorted,
  }
}

import { RANKING_WEIGHTS } from '@/lib/retention-config'
import type { LaunchBoost, LaunchRecord, RankedLaunch } from '@/lib/launch-types'

function boostMultiplier(boost: LaunchBoost | null, now = Date.now()): number {
  if (!boost) return 1
  if (new Date(boost.expiresAt).getTime() <= now) return 1
  return boost.rankMultiplier
}

function windowEndsInSec(record: LaunchRecord, now = Date.now()): number | null {
  if (record.phase !== 'EyesWindow' || !record.eyesWindowEnd) return null
  const sec = Math.floor((new Date(record.eyesWindowEnd).getTime() - now) / 1000)
  return sec > 0 ? sec : null
}

function recencyScore(createdAt: string, now = Date.now()): number {
  const ageHours = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  return Math.max(0, 1 - ageHours / 168)
}

export function computeRankScore(record: LaunchRecord, now = Date.now()): number {
  const activity = Math.min(record.trades24h / 100, 1)
  const volume = Math.min(record.volumeUsd24h / 50_000, 1)
  const fees = Math.min(record.feesEth24h / 2, 1)
  const recency = recencyScore(record.createdAt, now)
  const base =
    activity * RANKING_WEIGHTS.activity +
    volume * RANKING_WEIGHTS.volume +
    fees * RANKING_WEIGHTS.fees +
    recency * RANKING_WEIGHTS.recency
  return base * boostMultiplier(record.boost, now)
}

export function rankLaunches(
  launches: LaunchRecord[],
  now = Date.now(),
): RankedLaunch[] {
  const scored = launches.map((launch) => {
    const rankScore = computeRankScore(launch, now)
    const ends = windowEndsInSec(launch, now)
    const isBoosted =
      Boolean(launch.boost) &&
      launch.boost !== null &&
      new Date(launch.boost.expiresAt).getTime() > now
    return {
      ...launch,
      rankScore,
      rankPosition: 0,
      isBoosted,
      windowEndsInSec: ends,
    }
  })

  scored.sort((a, b) => b.rankScore - a.rankScore || b.createdAt.localeCompare(a.createdAt))
  return scored.map((row, i) => ({ ...row, rankPosition: i + 1 }))
}

export type LaunchFilter = 'all' | 'trending' | 'new' | 'window-open' | 'boosted'
export type LaunchSort = 'rank' | 'newest' | 'volume' | 'activity' | 'window-ending'

export function filterLaunches(
  ranked: RankedLaunch[],
  filter: LaunchFilter,
  query: string,
  now = Date.now(),
): RankedLaunch[] {
  const q = query.trim().toLowerCase()
  let rows = ranked

  if (filter === 'trending') {
    rows = rows.filter((r) => r.rankScore >= 0.25)
  } else if (filter === 'new') {
    const dayAgo = now - 24 * 60 * 60 * 1000
    rows = rows.filter((r) => new Date(r.createdAt).getTime() >= dayAgo)
  } else if (filter === 'window-open') {
    rows = rows.filter((r) => r.phase === 'EyesWindow' && (r.windowEndsInSec ?? 0) > 0)
  } else if (filter === 'boosted') {
    rows = rows.filter((r) => r.isBoosted)
  }

  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.symbol.toLowerCase().includes(q) ||
        r.creator.toLowerCase().includes(q),
    )
  }

  return rows
}

export function sortLaunches(rows: RankedLaunch[], sort: LaunchSort): RankedLaunch[] {
  const copy = [...rows]
  switch (sort) {
    case 'newest':
      copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'volume':
      copy.sort((a, b) => b.volumeUsd24h - a.volumeUsd24h)
      break
    case 'activity':
      copy.sort((a, b) => b.trades24h - a.trades24h)
      break
    case 'window-ending':
      copy.sort((a, b) => {
        const ae = a.windowEndsInSec ?? Number.MAX_SAFE_INTEGER
        const be = b.windowEndsInSec ?? Number.MAX_SAFE_INTEGER
        return ae - be
      })
      break
    default:
      copy.sort((a, b) => b.rankScore - a.rankScore)
  }
  return copy
}

export function formatWindowCountdown(sec: number | null): string | null {
  if (sec === null || sec <= 0) return null
  if (sec < 3600) return `${Math.ceil(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.ceil((sec % 3600) / 60)}m`
  return `${Math.floor(sec / 86400)}d`
}

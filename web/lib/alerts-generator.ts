import { randomUUID } from 'crypto'
import type { LaunchesSnapshot } from '@/lib/launch-types'
import { rankLaunches } from '@/lib/launch-ranking'
import { ALERT_TYPES, type StakeTierId } from '@/lib/retention-config'
import { getCurrentSeason } from '@/lib/season-utils'
import { upsertAlerts } from '@/lib/retention-store'
import type { RetentionAlert } from '@/lib/retention-types'

function minTierForType(typeId: string): StakeTierId {
  return ALERT_TYPES.find((a) => a.id === typeId)?.minTier ?? 'scout'
}

export function generateAlertsFromSnapshot(snapshot: LaunchesSnapshot): RetentionAlert[] {
  const now = Date.now()
  const alerts: RetentionAlert[] = []
  const ranked = rankLaunches(snapshot.launches)

  for (const launch of ranked) {
    const ageMs = now - new Date(launch.createdAt).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      alerts.push({
        id: `new-${launch.id}`,
        type: 'new_launch',
        launchId: launch.id,
        title: `New launch: ${launch.name}`,
        body: `$${launch.symbol} fair launch registered · Eyes Window ${launch.phase}`,
        createdAt: launch.createdAt,
        minTier: minTierForType('new_launch'),
      })
    }

    if (launch.phase === 'EyesWindow' && (launch.windowEndsInSec ?? 0) > 0) {
      alerts.push({
        id: `window-${launch.id}`,
        type: 'window_open',
        launchId: launch.id,
        title: `Eyes Window open: ${launch.name}`,
        body: `$${launch.symbol} · sniper-free buys only through the pad`,
        createdAt: launch.eyesWindowStart ?? launch.createdAt,
        minTier: minTierForType('window_open'),
      })
    }

    if (launch.rankScore >= 0.45) {
      alerts.push({
        id: `trend-${launch.id}-${Math.floor(now / 3_600_000)}`,
        type: 'trending_spike',
        launchId: launch.id,
        title: `Trending: ${launch.name}`,
        body: `Rank ${launch.rankPosition} · $${launch.volumeUsd24h.toLocaleString()} vol 24h`,
        createdAt: new Date().toISOString(),
        minTier: minTierForType('trending_spike'),
      })
    }

    for (const milestone of [10_000, 50_000, 100_000]) {
      if (launch.eyesBurnedTotal >= milestone) {
        alerts.push({
          id: `burn-${launch.id}-${milestone}`,
          type: 'burn_milestone',
          launchId: launch.id,
          title: `$EYES burn milestone`,
          body: `${launch.name} crossed ${milestone.toLocaleString()} $EYES burned`,
          createdAt: new Date().toISOString(),
          minTier: minTierForType('burn_milestone'),
        })
      }
    }
  }

  const season = getCurrentSeason()
  if (season.daysRemaining <= 3) {
    alerts.push({
      id: `season-end-${season.seasonNumber}`,
      type: 'season_ending',
      title: `${season.label} ending soon`,
      body: `${season.daysRemaining} days left · earn badges before reset`,
      createdAt: new Date().toISOString(),
      minTier: minTierForType('season_ending'),
    })
  }

  return alerts
}

export async function refreshAlertsFromSnapshot(snapshot: LaunchesSnapshot): Promise<RetentionAlert[]> {
  const alerts = generateAlertsFromSnapshot(snapshot)
  await upsertAlerts(alerts)
  return alerts
}

export function createManualAlert(input: {
  type: string
  title: string
  body: string
  launchId?: string
  minTier?: StakeTierId
}): RetentionAlert {
  return {
    id: randomUUID(),
    type: input.type,
    launchId: input.launchId,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    minTier: input.minTier ?? 'scout',
  }
}

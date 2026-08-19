/**
 * Config-driven retention systems — tiers, boosts, seasons, alerts, points.
 * Override via env where noted.
 */

export const RETENTION_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_RETENTION === 'true'

export const DISCOVERY_ENABLED =
  RETENTION_ENABLED || process.env.NEXT_PUBLIC_FEATURE_DISCOVERY === 'true'

/** $EYES stake tiers — gates tools, alerts, visibility. */
export const EYES_STAKE_TIERS = [
  {
    id: 'scout',
    name: 'Scout',
    minEyes: 0,
    badge: '◦',
    perks: ['Discovery feed', 'Public leaderboards'],
  },
  {
    id: 'builder',
    name: 'Builder',
    minEyes: 10_000,
    badge: '◆',
    perks: ['Early alerts (+15 min)', 'Boost discounts 5%'],
  },
  {
    id: 'operator',
    name: 'Operator',
    minEyes: 100_000,
    badge: '⬡',
    perks: ['Priority alerts', 'Boost discounts 10%', 'Creator analytics'],
  },
  {
    id: 'core',
    name: 'Core',
    minEyes: 1_000_000,
    badge: '★',
    perks: ['First alerts', 'Boost discounts 20%', 'Season badge slot', 'Profile flair'],
  },
] as const

export type StakeTierId = (typeof EYES_STAKE_TIERS)[number]['id']

export function stakeTierForBalance(eyesBalance: number): (typeof EYES_STAKE_TIERS)[number] {
  let tier: (typeof EYES_STAKE_TIERS)[number] = EYES_STAKE_TIERS[0]
  for (const t of EYES_STAKE_TIERS) {
    if (eyesBalance >= t.minEyes) tier = t
  }
  return tier
}

/** Creator visibility boosts — paid in $EYES, mostly burned. */
export const CREATOR_BOOST_PACKAGES = [
  {
    id: 'pulse',
    label: 'Pulse',
    durationHours: 6,
    eyesCost: 2_500,
    burnPercent: 80,
    rankBoost: 1.15,
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    durationHours: 24,
    eyesCost: 10_000,
    burnPercent: 85,
    rankBoost: 1.35,
  },
  {
    id: 'signal',
    label: 'Signal',
    durationHours: 72,
    eyesCost: 25_000,
    burnPercent: 90,
    rankBoost: 1.6,
  },
] as const

/** Launch fee settlement — prefer $EYES, portion burned. */
export const LAUNCH_FEE_EYES = {
  ethEquivalentUsd: 50,
  eyesDiscountPercent: 15,
  burnPercent: 40,
  preferEyes: true,
} as const

/** Season cadence + point weights (no inflationary token rewards). */
export const SEASON_CONFIG = {
  lengthDays: Number(process.env.NEXT_PUBLIC_SEASON_LENGTH_DAYS ?? '14'),
  epochIso: process.env.NEXT_PUBLIC_SEASON_EPOCH_ISO ?? '2026-09-01T00:00:00.000Z',
  pointWeights: {
    launchCreated: 100,
    tradeVolumeUsd: 0.01,
    eyesStaked: 0.001,
    boostSpent: 0.05,
    referralJoin: 25,
  },
  maxPointsPerDay: 5_000,
} as const

export const ALERT_TYPES = [
  { id: 'new_launch', label: 'New launch', minTier: 'scout' as StakeTierId },
  { id: 'window_open', label: 'Eyes Window open', minTier: 'scout' as StakeTierId },
  { id: 'trending_spike', label: 'Trending spike', minTier: 'builder' as StakeTierId },
  { id: 'burn_milestone', label: '$EYES burn milestone', minTier: 'scout' as StakeTierId },
  { id: 'season_ending', label: 'Season ending', minTier: 'builder' as StakeTierId },
] as const

export const RANKING_WEIGHTS = {
  activity: 0.35,
  volume: 0.35,
  fees: 0.2,
  recency: 0.1,
} as const

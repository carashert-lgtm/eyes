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

/** USD reference for $EYES settlement math — override when oracle wired. */
export const EYES_USD_PRICE = Number(process.env.NEXT_PUBLIC_EYES_USD_PRICE ?? '0.002')

const TIER_EARLY_ALERT_MINUTES: Record<StakeTierId, number> = {
  scout: 0,
  builder: 15,
  operator: 30,
  core: 60,
}

const TIER_BOOST_DISCOUNT: Record<StakeTierId, number> = {
  scout: 0,
  builder: 5,
  operator: 10,
  core: 20,
}

export function tierEarlyAlertMinutes(tierId: StakeTierId): number {
  return TIER_EARLY_ALERT_MINUTES[tierId]
}

export function tierBoostDiscountPercent(tierId: StakeTierId): number {
  return TIER_BOOST_DISCOUNT[tierId]
}

export function computeLaunchFeeEyes(tierId: StakeTierId = 'scout') {
  const baseUsd = LAUNCH_FEE_EYES.ethEquivalentUsd
  const discountedUsd = baseUsd * (1 - LAUNCH_FEE_EYES.eyesDiscountPercent / 100)
  const tierExtra = tierBoostDiscountPercent(tierId)
  const finalUsd = discountedUsd * (1 - tierExtra / 100)
  const eyesCost = Math.ceil(finalUsd / Math.max(EYES_USD_PRICE, 0.000001))
  const burnAmount = Math.floor((eyesCost * LAUNCH_FEE_EYES.burnPercent) / 100)
  const treasuryAmount = eyesCost - burnAmount
  return { eyesCost, burnAmount, treasuryAmount, finalUsd }
}

export function minLaunchFeeTreasuryAmount(): number {
  return Math.min(
    ...EYES_STAKE_TIERS.map((t) => computeLaunchFeeEyes(t.id).treasuryAmount),
  )
}

export function computeBoostCost(
  packageId: string,
  tierId: StakeTierId = 'scout',
): {
  package: (typeof CREATOR_BOOST_PACKAGES)[number]
  eyesCost: number
  burnAmount: number
  treasuryAmount: number
} | null {
  const pkg = CREATOR_BOOST_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) return null
  const discount = tierBoostDiscountPercent(tierId)
  const eyesCost = Math.ceil(pkg.eyesCost * (1 - discount / 100))
  const burnAmount = Math.floor((eyesCost * pkg.burnPercent) / 100)
  const treasuryAmount = eyesCost - burnAmount
  return { package: pkg, eyesCost, burnAmount, treasuryAmount }
}

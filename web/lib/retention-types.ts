import type { StakeTierId } from '@/lib/retention-config'

export type BoostRecord = {
  id: string
  launchId: string
  numericLaunchId: number
  packageId: string
  wallet: string
  txHash: string
  eyesSpent: number
  burnAmount: number
  treasuryAmount: number
  rankMultiplier: number
  label: string
  expiresAt: string
  createdAt: string
}

export type LaunchFeeRecord = {
  id: string
  wallet: string
  txHash: string
  eyesSpent: number
  burnAmount: number
  treasuryAmount: number
  launchTxHash?: string
  createdAt: string
}

export type SeasonPointEvent = {
  id: string
  type: 'launch_created' | 'boost_spent' | 'launch_fee' | 'referral_join' | 'trade_volume'
  points: number
  meta?: Record<string, string | number>
  createdAt: string
}

export type SeasonPointsRecord = {
  wallet: string
  seasonNumber: number
  points: number
  events: SeasonPointEvent[]
  updatedAt: string
}

export type RetentionAlert = {
  id: string
  type: string
  launchId?: string
  title: string
  body: string
  createdAt: string
  minTier: StakeTierId
}

export type RetentionLedger = {
  boosts: BoostRecord[]
  launchFees: LaunchFeeRecord[]
  seasonPoints: SeasonPointsRecord[]
  alerts: RetentionAlert[]
  updatedAt: string
}

export type CreatorReputation = {
  score: number
  label: string
  launches: number
  volumeUsd24h: number
  eyesBurned: number
  boostsPurchased: number
}

export type SeasonLeaderRow = {
  rank: number
  wallet: string
  points: number
  tierHint: StakeTierId
}

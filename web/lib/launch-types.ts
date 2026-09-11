export type LaunchPhase = 'Pending' | 'EyesWindow' | 'Trading'

export type LaunchChainKey = 'base' | 'ethereum' | 'solana'

export type LaunchBoost = {
  packageId: string
  label: string
  rankMultiplier: number
  expiresAt: string
  eyesSpent: number
  burnPercent: number
}

export type LaunchRecord = {
  id: string
  launchId: number
  chainKey: LaunchChainKey
  name: string
  symbol: string
  creator: string
  tokenAddress: string
  pairAddress?: string
  phase: LaunchPhase
  eyesWindowStart?: string
  eyesWindowEnd?: string
  lpLocked: boolean
  volumeUsd24h: number
  trades24h: number
  feesEth24h: number
  eyesBurnedTotal: number
  boost: LaunchBoost | null
  fomoUrl?: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  createdAt: string
  updatedAt: string
}

export type LaunchesSnapshot = {
  updatedAt: string
  source: 'indexer'
  launches: LaunchRecord[]
}

export type RankedLaunch = LaunchRecord & {
  rankScore: number
  rankPosition: number
  isBoosted: boolean
  windowEndsInSec: number | null
}

export const EMPTY_LAUNCHES_SNAPSHOT: LaunchesSnapshot = {
  updatedAt: new Date(0).toISOString(),
  source: 'indexer',
  launches: [],
}

export function phaseLabel(phase: LaunchPhase): string {
  if (phase === 'EyesWindow') return 'Eyes Window'
  if (phase === 'Trading') return 'Trading'
  return 'Pending'
}

import type { ApiKeyTier } from '@/lib/settings/types'

export type RateTierConfig = {
  id: ApiKeyTier | 'anonymous'
  label: string
  requestsPerMinute: number
  requestsPerDay: number
  overageBurnPer100Requests: number
}

export const RATE_TIERS: Record<ApiKeyTier | 'anonymous', RateTierConfig> = {
  anonymous: {
    id: 'anonymous',
    label: 'Anonymous',
    requestsPerMinute: 60,
    requestsPerDay: 500,
    overageBurnPer100Requests: 0,
  },
  free: {
    id: 'free',
    label: 'Free',
    requestsPerMinute: 120,
    requestsPerDay: 2_000,
    overageBurnPer100Requests: 50,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    requestsPerMinute: 600,
    requestsPerDay: 50_000,
    overageBurnPer100Requests: 25,
  },
  team: {
    id: 'team',
    label: 'Team',
    requestsPerMinute: 300,
    requestsPerDay: 10_000,
    overageBurnPer100Requests: 0,
  },
}

export function getTierLimits(tier: ApiKeyTier | 'anonymous'): RateTierConfig {
  return RATE_TIERS[tier] ?? RATE_TIERS.free
}

export function dailyLimitForTier(tier: ApiKeyTier): number {
  return getTierLimits(tier).requestsPerDay
}

export function minuteLimitForTier(tier: ApiKeyTier | 'anonymous'): number {
  return getTierLimits(tier).requestsPerMinute
}

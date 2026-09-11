import type { LaunchChainKey } from '@/lib/launch-chains/registry'

export type WalletAutoLockMinutes = 0 | 5 | 15 | 30 | 60 | 240 | 1440

export type WebhookEventFilter =
  | 'launch.created'
  | 'launch.discovery_registered'
  | 'webhook.test'

export type AccountSettings = {
  defaultLaunchChain: LaunchChainKey
  launchWebhookUrl: string | null
  launchWebhookSecret: string | null
  publicCreatorProfile: boolean
  /** Comma-separated chain keys or empty = all chains */
  webhookFilterChains: LaunchChainKey[]
  webhookOnlyMine: boolean
  webhookEvents: WebhookEventFilter[]
  walletAutoLockMinutes: WalletAutoLockMinutes
  discordDmLaunches: boolean
  discordDmPresale: boolean
  discordDmSeason: boolean
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  defaultLaunchChain: 'base',
  launchWebhookUrl: null,
  launchWebhookSecret: null,
  publicCreatorProfile: true,
  webhookFilterChains: [],
  webhookOnlyMine: false,
  webhookEvents: ['launch.created', 'launch.discovery_registered'],
  walletAutoLockMinutes: 15,
  discordDmLaunches: false,
  discordDmPresale: false,
  discordDmSeason: false,
}

export type ApiKeyTier = 'free' | 'pro' | 'team'

export type ApiKeyScope = 'launches:read' | 'launches:write' | 'account:read'

export type ApiKeyKind = 'personal' | 'team'

export type ApiKeyRecord = {
  id: string
  accountId: string
  email: string
  name: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  tier: ApiKeyTier
  kind: ApiKeyKind
  teamId: string | null
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export type ApiKeyUsageDay = {
  day: string
  count: number
}

export type ApiKeyUsageSummary = {
  keyId: string
  tier: ApiKeyTier
  dailyLimit: number
  requestsToday: number
  overageTokensBurned: number
  history: ApiKeyUsageDay[]
}

export type ApiKeyAuth = ApiKeyRecord & {
  walletAddress?: string | null
  solanaAddress?: string | null
}

export type OAuthAppRecord = {
  id: string
  accountId: string
  name: string
  clientId: string
  clientPrefix: string
  redirectUris: string[]
  scopes: ApiKeyScope[]
  createdAt: string
  revokedAt: string | null
}

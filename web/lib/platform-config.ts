/**
 * Platform-wide config: team pool, referral rewards, mcap unlocks.
 */

export { FOUNDER_SHARE, EYES_TOTAL_SUPPLY, formatTokensShort } from '@/lib/founder-share-config'

import { FOUNDER_SHARE } from '@/lib/founder-share-config'

/** Operational Discord / Team Space pool — capped at owner allocation (10%). */
export const TEAM_POOL = {
  totalTokens: Number(
    process.env.NEXT_PUBLIC_TEAM_POOL_TOKENS ?? String(FOUNDER_SHARE.totalTokens),
  ),
  label: 'Owner allocation pool',
  founderShare: FOUNDER_SHARE,
} as const

export const REFERRAL_REWARDS = {
  discordInvite: Number(process.env.REFERRAL_REWARD_DISCORD ?? '1000'),
  telegramInvite: Number(process.env.REFERRAL_REWARD_TELEGRAM ?? '500'),
  referralClick: Number(process.env.REFERRAL_REWARD_CLICK ?? '10'),
  referredJoin: Number(process.env.REFERRAL_REWARD_JOIN ?? '2500'),
  referredContribution: Number(process.env.REFERRAL_REWARD_CONTRIBUTION ?? '5000'),
  defaultLocked: true,
} as const

export const MCAP_UNLOCK_TIERS = [
  { mcapUsd: 100_000, unlockPercent: 5, label: '$100K' },
  { mcapUsd: 500_000, unlockPercent: 10, label: '$500K' },
  { mcapUsd: 1_000_000, unlockPercent: 15, label: '$1M' },
  { mcapUsd: 5_000_000, unlockPercent: 25, label: '$5M' },
] as const

export const DISCORD_BOT_CONFIG = {
  ownerIds: (process.env.DISCORD_OWNER_IDS ?? '').split(',').filter(Boolean),
  staffLogChannelId: process.env.DISCORD_STAFF_LOG_CHANNEL_ID ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  largeUnlockConfirmThreshold: Number(
    process.env.LARGE_UNLOCK_THRESHOLD ?? '100000',
  ),
} as const

export { SITE_URL } from '@/lib/chain-config'

/** Shared platform user / pool snapshot schema (bot writes, web reads). */

export type PoolUserRecord = {
  discordId: string
  username: string
  referralCode: string
  invitedBy: string | null
  totalAllocated: number
  locked: number
  unlocked: number
  claimed: number
  mcapUnlockedTiers: string[]
  discordInvites: number
  telegramInvites: number
  referralClicks: number
  referredJoins: number
  referredContributions: number
  walletAddress: string | null
  createdAt: string
  updatedAt: string
}

export type PoolSnapshot = {
  updatedAt: string
  pool: {
    total: number
    locked: number
    unlocked: number
    claimed: number
    remaining: number
  }
  referral: {
    totalUsers: number
    totalReferralClicks: number
    totalInviteRewards: number
    pendingLockedRewards: number
  }
  users: PoolUserRecord[]
}

export const EMPTY_POOL_SNAPSHOT: PoolSnapshot = {
  updatedAt: new Date(0).toISOString(),
  pool: {
    total: 0,
    locked: 0,
    unlocked: 0,
    claimed: 0,
    remaining: 0,
  },
  referral: {
    totalUsers: 0,
    totalReferralClicks: 0,
    totalInviteRewards: 0,
    pendingLockedRewards: 0,
  },
  users: [],
}

export function aggregatePoolFromUsers(
  users: PoolUserRecord[],
  totalPoolCap: number,
): PoolSnapshot['pool'] {
  const locked = users.reduce((s, u) => s + u.locked, 0)
  const unlocked = users.reduce((s, u) => s + u.unlocked, 0)
  const claimed = users.reduce((s, u) => s + u.claimed, 0)
  const allocated = users.reduce((s, u) => s + u.totalAllocated, 0)
  const total = totalPoolCap || allocated
  const remaining = Math.max(0, total - locked - unlocked - claimed)
  return { total, locked, unlocked, claimed, remaining }
}

import type { PoolSnapshot, PoolUserRecord } from '@/lib/pool-types'

function redactUser(user: PoolUserRecord, viewerDiscordId: string | null): PoolUserRecord {
  const isSelf = viewerDiscordId && user.discordId === viewerDiscordId
  if (isSelf) return user
  return {
    ...user,
    referralCode: '—',
    walletAddress: null,
    invitedBy: null,
  }
}

/** Team Space snapshot — hide other members' wallets and referral codes. */
export function sanitizePoolSnapshotForSession(
  snapshot: PoolSnapshot,
  viewerDiscordId: string | null,
): PoolSnapshot {
  return {
    ...snapshot,
    users: snapshot.users.map((u) => redactUser(u, viewerDiscordId)),
  }
}

export function canViewPoolUser(
  sessionDiscordId: string | null,
  sessionWallet: string | null,
  target: PoolUserRecord | null,
  requestedWallet: string | null,
  requestedDiscordId: string | null,
): boolean {
  if (!target) return true
  if (sessionDiscordId && target.discordId === sessionDiscordId) return true
  if (requestedDiscordId && requestedDiscordId !== sessionDiscordId) return false
  if (requestedWallet && sessionWallet) {
    return requestedWallet.toLowerCase() === sessionWallet.toLowerCase()
  }
  if (requestedWallet && !sessionWallet) return false
  return !requestedWallet
}

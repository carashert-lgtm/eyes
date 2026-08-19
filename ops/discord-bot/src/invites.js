/** Tracks Discord invite uses and credits inviters when auto-rewards are enabled. */

const inviteCache = new Map()

export async function refreshInviteCache(guild) {
  const invites = await guild.invites.fetch()
  inviteCache.clear()
  for (const invite of invites.values()) {
    if (!invite.inviter || invite.inviter.bot) continue
    inviteCache.set(invite.code, {
      uses: invite.uses ?? 0,
      inviterId: invite.inviter.id,
    })
  }
}

export function cacheInvite(invite) {
  if (!invite.inviter || invite.inviter.bot) return
  inviteCache.set(invite.code, {
    uses: invite.uses ?? 0,
    inviterId: invite.inviter.id,
  })
}

export function removeInviteFromCache(invite) {
  inviteCache.delete(invite.code)
}

/** Returns the invite whose use count increased, or null. Updates cache. */
export async function findUsedInvite(guild) {
  const invites = await guild.invites.fetch()
  let usedInvite = null

  for (const invite of invites.values()) {
    const cached = inviteCache.get(invite.code)
    const uses = invite.uses ?? 0

    if (cached && uses > cached.uses) {
      usedInvite = invite
    }

    if (invite.inviter && !invite.inviter.bot) {
      inviteCache.set(invite.code, {
        uses,
        inviterId: invite.inviter.id,
      })
    }
  }

  return usedInvite
}

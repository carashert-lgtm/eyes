/** Best-effort Discord DM alerts for linked accounts. */

export async function sendAccountDm(client, discordId, message) {
  if (!client || !discordId) return { ok: false, error: 'no_client' }
  try {
    const user = await client.users.fetch(discordId)
    if (!user) return { ok: false, error: 'user_not_found' }
    await user.send(message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'dm_failed' }
  }
}

export async function notifyLaunchDm(client, { discordId, launchName, launchSymbol, launchUrl }) {
  const text = [
    '**New launch on Eyes Open**',
    launchName ? `${launchName}${launchSymbol ? ` ($${launchSymbol})` : ''}` : 'A launch you follow is live.',
    launchUrl ? `<${launchUrl}>` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return sendAccountDm(client, discordId, text)
}

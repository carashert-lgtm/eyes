import '../src/load-env.js'

const token = process.env.DISCORD_BOT_TOKEN
const channelId = process.env.SETUP_ANNOUNCE_CHANNEL_ID ?? '1531103585230651573'

const headers = {
  Authorization: `Bot ${token}`,
  'Content-Type': 'application/json',
  'User-Agent': 'DiscordBot (https://github.com/discord/discord-api-docs, 1.0)',
}

const content = [
  '**Eyes Warden is live** — presale, team pool, and referrals bot.',
  '',
  '**Everyone:** `!help` · `!linkwallet 0x…` · `!presalestatus` · `!myref`',
  '**Music:** Bradley → `/play` (slash commands only)',
  '**Presale:** https://www.eyesopen.to/presale',
  '',
  'Owner: run `!whoami` to confirm owner access.',
].join('\n')

const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ content }),
})

if (res.ok) {
  console.log('Posted setup message to channel', channelId)
} else {
  console.error('Failed:', res.status, await res.text())
  process.exit(1)
}

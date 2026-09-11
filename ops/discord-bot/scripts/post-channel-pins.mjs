import '../src/load-env.js'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const token = process.env.DISCORD_BOT_TOKEN
const guildId = process.env.DISCORD_GUILD_ID ?? '1432509930220425239'

const START_ISO =
  process.env.NEXT_PUBLIC_PRESALE_START_ISO ??
  readStartIsoFromWebEnv() ??
  '2026-08-24T00:00:00.000Z'
const WINDOW_DAYS = 14

function readStartIsoFromWebEnv() {
  const envPath = path.join(__dirname, '../../web/.env.local')
  try {
    for (const line of readFileSync(envPath, 'utf8').splitlines()) {
      if (line.startsWith('NEXT_PUBLIC_PRESALE_START_ISO=')) {
        return line.split('=')[1].trim()
      }
    }
  } catch {
    return null
  }
  return null
}

function presaleEndIso(startIso) {
  const start = new Date(startIso)
  return new Date(start.getTime() + WINDOW_DAYS * 86400000)
}

function formatShort(d) {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function daysRemaining(end) {
  const ms = end.getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / 86400000)
}

const startDate = new Date(START_ISO)
const endDate = presaleEndIso(START_ISO)
const daysLeft = daysRemaining(endDate)
const windowLine = `**Live now** · **${daysLeft} day${daysLeft === 1 ? '' : 's'} left** · ends **${formatShort(endDate)} UTC**`

const headers = {
  Authorization: `Bot ${token}`,
  'Content-Type': 'application/json',
  'User-Agent': 'DiscordBot (https://github.com/discord/discord-api-docs, 1.0)',
}

const channels = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
  headers,
}).then((r) => r.json())

function findChannel(name) {
  return channels.find((c) => c.type === 0 && c.name === name)
}

const RULES_EMBED = {
  title: 'Eyes Open · Server Rules',
  description: 'Quick rules — read before you chat or send funds.',
  color: 0x6366f1,
  fields: [
    {
      name: 'Official links only',
      value: '**https://www.eyesopen.to**\nNever send crypto from a DM or random link.',
      inline: false,
    },
    {
      name: 'Be cool',
      value: 'No harassment, spam, scams, or pump talk.',
      inline: false,
    },
    {
      name: 'Not financial advice',
      value: 'You can lose everything. No promises on price, profit, or listings.',
      inline: false,
    },
    {
      name: 'Two bots, two jobs',
      value: '**Bradley** → `/play` music\n**Eyes Warden** → `!help` presale & team',
      inline: false,
    },
    {
      name: 'Referrals',
      value: '`!myref` · `!linkwallet` = founder-share pool. **Not the same as presale.**',
      inline: false,
    },
  ],
  footer: { text: 'Presale guide → #how-to-presale · Legal → eyesopen.to/legal' },
}

const HOWTO_EMBED = {
  title: 'How to join the $EYES presale',
  description: `${windowLine}\nMax **200M $EYES** · Started **${formatShort(startDate)} UTC**`,
  color: 0x22c55e,
  fields: [
    {
      name: 'Tier prices',
      value:
        '**Days 1–5:** $0.0003\n**Days 6–10:** $0.0005\n**Days 11–14:** $0.0008\n**After presale:** $0.0015 ref',
      inline: true,
    },
    {
      name: '4 steps',
      value:
        '1. **eyesopen.to/presale**\n2. Send **ETH/SOL** to treasury **on that page**\n3. Register the **wallet you paid from**\n4. Receive **$EYES on Base** (queued after verify)',
      inline: false,
    },
    {
      name: 'Important',
      value: 'Not an investment · No price promise · Copy treasury from the site only',
      inline: false,
    },
    {
      name: 'Discord commands',
      value: '`!linkwallet 0x…` · `!presalestatus` · `!help`',
      inline: false,
    },
  ],
  footer: { text: 'Eyes Open. No Snipers. No Games.' },
}

const TOKENOMICS_EMBED = {
  title: '$EYES · Tokenomics (short version)',
  description: '1B supply · on-chain fees · presale is a **separate bucket** from trading fees.',
  color: 0xd4af37,
  fields: [
    {
      name: 'Supply',
      value:
        '**1,000,000,000 $EYES** · minted once\n**10% owner allocation** (disclosed)\n**20% max** public presale · rest → LP / ecosystem',
      inline: false,
    },
    {
      name: 'Trading fees (after launch)',
      value:
        '**1%** fee on platform-launched token swaps\n**50%** → launch creator (ETH)\n**50%** → buy & burn **$EYES**',
      inline: false,
    },
    {
      name: 'Presale ≠ fee model',
      value:
        'Presale ETH funds **launch ops** (marketing, visibility).\nOn-chain **50/50 fee split** starts with platform trading — different buckets.',
      inline: false,
    },
    {
      name: 'Fair launches',
      value:
        '**Eyes Window** — gated open, no sniper dumps, **LP locked** at seed.',
      inline: false,
    },
    {
      name: 'Full breakdown',
      value: '**https://www.eyesopen.to/tokenomics**\nNot financial advice · No price promises',
      inline: false,
    },
  ],
  footer: { text: 'Presale → #how-to-presale · Legal → eyesopen.to/legal' },
}

async function clearBotMessages(channelId) {
  const me = await fetch('https://discord.com/api/v10/users/@me', { headers }).then((r) =>
    r.json(),
  )
  const msgs = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`,
    { headers },
  ).then((r) => r.json())
  if (!Array.isArray(msgs)) return
  for (const msg of msgs) {
    if (msg.author?.id === me.id) {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${msg.id}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {})
    }
  }
}

async function postEmbed(name, embed) {
  const ch = findChannel(name)
  if (!ch) {
    console.error(`Channel #${name} not found`)
    return false
  }
  await clearBotMessages(ch.id)
  const res = await fetch(`https://discord.com/api/v10/channels/${ch.id}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embeds: [embed] }),
  })
  if (!res.ok) {
    console.error(`#${name} failed:`, res.status, await res.text())
    return false
  }
  const msg = await res.json()
  const pin = await fetch(`https://discord.com/api/v10/channels/${ch.id}/pins/${msg.id}`, {
    method: 'PUT',
    headers,
  })
  if (!pin.ok) console.warn(`#${name} posted but pin failed:`, pin.status)
  else console.log(`Posted + pinned embed in #${name}`)
  return true
}

console.log('Presale start:', START_ISO, '| days left:', daysLeft)
const rulesOk = await postEmbed('rules', RULES_EMBED)
const howtoOk = await postEmbed('how-to-presale', HOWTO_EMBED)
const tokenomicsOk = await postEmbed('tokenomics', TOKENOMICS_EMBED)
if (!rulesOk || !howtoOk || !tokenomicsOk) process.exit(1)

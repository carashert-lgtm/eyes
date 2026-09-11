import { EmbedBuilder } from 'discord.js'
import { config } from './db.js'

const PACKAGE_COLORS = {
  pulse: 0x6366f1,
  spotlight: 0xd4af37,
  signal: 0xef4444,
}

function truncateAddress(address) {
  if (!address || address.length < 12) return address ?? '—'
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function launchDetailUrl(launchSlugId) {
  const base = (config.siteUrl ?? 'https://www.eyesopen.to').replace(/\/$/, '')
  return `${base}/app/launches/${encodeURIComponent(launchSlugId)}`
}

function formatExpiry(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  } catch {
    return iso ?? '—'
  }
}

let cachedLaunchesChannelId = null

async function resolveLaunchesChannel(client) {
  if (!client) return null

  const configured = config.launchesChannelId || cachedLaunchesChannelId
  if (configured) {
    const ch = await client.channels.fetch(configured).catch(() => null)
    if (ch?.isTextBased()) return ch
  }

  if (!config.guildId) return null
  const guild = await client.guilds.fetch(config.guildId).catch(() => null)
  if (!guild) return null

  const channels = await guild.channels.fetch().catch(() => null)
  if (!channels) return null

  const match = channels.find((c) => c?.type === 0 && c.name === 'launches')
  if (match?.isTextBased()) {
    cachedLaunchesChannelId = match.id
    return match
  }
  return null
}

function baseLinks(data) {
  const lines = []
  const detail = launchDetailUrl(data.launchId)
  lines.push(`[View on Eyes Open](${detail})`)
  if (data.fomoUrl) lines.push(`[Trade on FOMO](${data.fomoUrl})`)
  return lines.join(' · ')
}

/** Pulse — one-line alert. */
function buildPulsePayload(data) {
  const name = data.launchSymbol ? `$${data.launchSymbol}` : data.launchName
  const detail = launchDetailUrl(data.launchId)
  return {
    content: `📡 **Pulse** · **${name}** creator boosted visibility on Eyes Open · [View launch](${detail})`,
    allowedMentions: { parse: [] },
  }
}

/** Spotlight — detailed embed. */
function buildSpotlightPayload(data) {
  const name = data.launchName ?? 'Launch'
  const symbol = data.launchSymbol ? `$${data.launchSymbol}` : '—'
  const embed = new EmbedBuilder()
    .setColor(PACKAGE_COLORS.spotlight)
    .setTitle('✦ Spotlight boost')
    .setDescription(`**${name}** (${symbol}) is boosted on the Eyes Open discovery feed.`)
    .addFields(
      {
        name: 'Duration',
        value: `${data.durationHours ?? '—'}h · rank **${data.rankMultiplier ?? '—'}×**`,
        inline: true,
      },
      {
        name: '$EYES spent',
        value: `${Number(data.eyesSpent ?? 0).toLocaleString()} (${Number(data.burnAmount ?? 0).toLocaleString()} burned)`,
        inline: true,
      },
      {
        name: 'Active until',
        value: formatExpiry(data.expiresAt),
        inline: true,
      },
      {
        name: 'Token',
        value: `\`${truncateAddress(data.tokenAddress)}\``,
        inline: true,
      },
      {
        name: 'Creator',
        value: `\`${truncateAddress(data.wallet)}\``,
        inline: true,
      },
      {
        name: 'Links',
        value: baseLinks(data),
        inline: false,
      },
    )
    .setFooter({ text: 'Eyes Open · Boost Visibility' })
    .setTimestamp()

  return { embeds: [embed], allowedMentions: { parse: [] } }
}

/** Signal — largest alert + @everyone. */
function buildSignalPayload(data) {
  const name = data.launchName ?? 'Launch'
  const symbol = data.launchSymbol ? `$${data.launchSymbol}` : '—'
  const embed = new EmbedBuilder()
    .setColor(PACKAGE_COLORS.signal)
    .setTitle('🚨 SIGNAL — Maximum visibility boost')
    .setDescription(
      [
        `**${name}** (${symbol}) just activated a **Signal** boost on Eyes Open.`,
        '',
        'This launch is prioritized on discovery, leaderboard ranking, and creator visibility for **72 hours**.',
        '',
        baseLinks(data),
      ].join('\n'),
    )
    .addFields(
      {
        name: 'Rank multiplier',
        value: `**${data.rankMultiplier ?? '—'}×** discovery score`,
        inline: true,
      },
      {
        name: '$EYES committed',
        value: `**${Number(data.eyesSpent ?? 0).toLocaleString()}** total · **${Number(data.burnAmount ?? 0).toLocaleString()}** burned`,
        inline: true,
      },
      {
        name: 'Boost ends',
        value: formatExpiry(data.expiresAt),
        inline: true,
      },
      {
        name: 'Contract',
        value: data.tokenAddress ? `\`${data.tokenAddress}\`` : '—',
        inline: false,
      },
    )
    .setFooter({ text: 'Eyes Open · No Snipers. No Games.' })
    .setTimestamp()

  return {
    content: '@everyone **Signal boost live** — a creator just maxed visibility on Eyes Open.',
    embeds: [embed],
    allowedMentions: { parse: ['everyone'] },
  }
}

export async function postBoostToLaunches(client, data) {
  const channel = await resolveLaunchesChannel(client)
  if (!channel) {
    console.warn('[boost-discord] #launches channel not found — set DISCORD_LAUNCHES_CHANNEL_ID')
    return { ok: false, error: 'launches_channel_not_configured' }
  }

  const packageId = String(data.packageId ?? '').toLowerCase()
  let payload
  if (packageId === 'pulse') payload = buildPulsePayload(data)
  else if (packageId === 'spotlight') payload = buildSpotlightPayload(data)
  else if (packageId === 'signal') payload = buildSignalPayload(data)
  else throw new Error(`Unknown boost package: ${packageId}`)

  await channel.send(payload)
  return { ok: true, channelId: channel.id }
}

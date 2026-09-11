import { EmbedBuilder } from 'discord.js'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const settingsPath =
  process.env.MOD_SETTINGS_PATH ??
  path.join(__dirname, '../data/mod-settings.json')

/** @type {Record<string, string>} guildId → mod log channel id */
let modLogChannels = {}

function loadModSettings() {
  if (!existsSync(settingsPath)) return
  try {
    const raw = JSON.parse(readFileSync(settingsPath, 'utf8'))
    modLogChannels = raw.modLogChannels ?? {}
  } catch {
    modLogChannels = {}
  }
}

function saveModSettings() {
  mkdirSync(path.dirname(settingsPath), { recursive: true })
  writeFileSync(
    settingsPath,
    JSON.stringify({ modLogChannels }, null, 2),
    'utf8',
  )
}

loadModSettings()

const RAW_BAD_WORDS = [
  'fuck',
  'fucker',
  'fucking',
  'fucked',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'bitching',
  'cunt',
  'cunts',
  'asshole',
  'assholes',
  'dick',
  'dickhead',
  'pussy',
  'pussies',
  'bastard',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'retarded',
]

function generateVariants(word) {
  const variants = new Set([word, word.toUpperCase(), word[0].toUpperCase() + word.slice(1)])
  const replacements = {
    a: ['@', '4'],
    e: ['3'],
    i: ['1', '!', 'l'],
    o: ['0'],
    u: ['v'],
    s: ['$', '5'],
    c: ['k'],
  }
  for (let i = 0; i < word.length; i += 1) {
    const char = word[i].toLowerCase()
    const reps = replacements[char]
    if (!reps) continue
    for (const rep of reps) {
      variants.add(word.slice(0, i) + rep + word.slice(i + 1))
    }
  }
  if (word.length > 3) {
    variants.add(`${word[0]}*${word.slice(2)}`)
    variants.add(`${word[0]}**${word.slice(3)}`)
  }
  return [...variants]
}

const BAD_WORD_PATTERNS = []
for (const word of RAW_BAD_WORDS) {
  for (const variant of generateVariants(word)) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[*•·]?')
    BAD_WORD_PATTERNS.push(new RegExp(`\\b${escaped}\\b`, 'i'))
  }
}

for (const pattern of [
  /f+[\W_]*u+[\W_]*c+[\W_]*k+/i,
  /sh+[\W_]*i+[\W_]*t+/i,
  /b+[\W_]*i+[\W_]*t+[\W_]*c+[\W_]*h+/i,
  /c+[\W_]*u+[\W_]*n+[\W_]*t+/i,
]) {
  BAD_WORD_PATTERNS.push(pattern)
}

export function containsBadWord(text) {
  if (!text) return false
  return BAD_WORD_PATTERNS.some((pattern) => pattern.test(text))
}

export function getModLogChannelId(guildId) {
  return (
    modLogChannels[guildId] ??
    process.env.DISCORD_MOD_LOG_CHANNEL_ID?.trim() ??
    config.staffLogChannelId ??
    null
  )
}

export function setModLogChannel(guildId, channelId) {
  modLogChannels[guildId] = channelId
  saveModSettings()
}

export function clearModLogChannel(guildId) {
  delete modLogChannels[guildId]
  saveModSettings()
}

export function isModFilterEnabled() {
  const raw = process.env.MOD_FILTER_ENABLED
  if (raw === undefined || raw === '') return true
  return !['0', 'false', 'no', 'off'].includes(raw.toLowerCase())
}

export function modTimeoutMinutes() {
  const n = Number(process.env.MOD_TIMEOUT_MINUTES ?? '10')
  return Number.isFinite(n) && n > 0 ? n : 10
}

/**
 * Profanity filter — delete message, optional timeout, mod log.
 * @returns {true} if message was handled (caller should skip commands)
 */
export async function handleProfanityFilter(message) {
  if (!isModFilterEnabled()) return false
  if (message.author.bot) return false
  if (!message.guild) return false
  if (config.guildId && message.guild.id !== config.guildId) return false
  if (message.content.startsWith('!')) return false
  if (!containsBadWord(message.content)) return false

  const member = message.member
  if (member?.permissions.has('Administrator')) return false

  let muted = false
  try {
    await message.delete()
  } catch {
    return false
  }

  const timeoutMs = modTimeoutMinutes() * 60 * 1000
  if (member && message.guild.members.me?.permissions.has('ModerateMembers')) {
    try {
      await member.timeout(timeoutMs, 'Prohibited language')
      muted = true
    } catch {
      // Missing hierarchy or permission — deletion still counts
    }
  }

  await message.channel
    .send({
      content: muted
        ? `${message.author}, message removed — ${modTimeoutMinutes()} minute timeout for prohibited language.`
        : `${message.author}, message removed for prohibited language.`,
    })
    .then((m) => setTimeout(() => m.delete().catch(() => {}), 8000))
    .catch(() => {})

  const logId = getModLogChannelId(message.guild.id)
  if (logId) {
    const logChannel = await message.guild.channels.fetch(logId).catch(() => null)
    if (logChannel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('Moderation · prohibited language')
        .setColor(0xef4444)
        .setTimestamp()
        .addFields(
          {
            name: 'User',
            value: `${message.author.tag} (\`${message.author.id}\`)`,
            inline: false,
          },
          { name: 'Channel', value: `${message.channel}`, inline: true },
          {
            name: 'Action',
            value: muted ? `Deleted + ${modTimeoutMinutes()}m timeout` : 'Deleted',
            inline: true,
          },
          {
            name: 'Content',
            value: `\`\`\`${message.content.slice(0, 800)}\`\`\``,
            inline: false,
          },
        )
      await logChannel.send({ embeds: [embed] }).catch(() => {})
    }
  }

  return true
}

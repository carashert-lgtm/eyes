import './load-env.js'
import { logEnvHealth, logEnvSources } from './load-env.js'
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} from 'discord.js'
import {
  config,
  ensureUser,
  exportSnapshot,
  enableDiscordInviteTracking,
  getUserByCode,
  getUserByDiscord,
  grantLocked,
  grantUnlocked,
  isDiscordInviteTrackingEnabled,
  isOwner,
  logAudit,
  moveLockToUnlock,
  recordClick,
  recordDiscordInviteJoin,
  removeShare,
  resetUserAllocation,
  setAllocation,
  createTeamTokenClaim,
  getPendingSendStats,
  db,
} from './db.js'
import {
  cacheInvite,
  findUsedInvite,
  refreshInviteCache,
  removeInviteFromCache,
} from './invites.js'
import { startWebhookServer } from './webhook.js'
import { distributePresaleTokens, getDistributorStatus } from './presale-distribute.js'
import { inspectPrivateKeyEnv } from './private-key.js'
import { buildHelpEmbeds, getTreasuryAddress } from './bot-format.js'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createTeamActivationCode,
  formatTeamCodeRow,
  listTeamActivationCodes,
  revokeTeamActivationCode,
} from './team-codes.js'

if (!config.token) {
  console.error('DISCORD_BOT_TOKEN required')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
})

async function staffLog(content) {
  if (!config.staffLogChannelId) return
  const ch = await client.channels.fetch(config.staffLogChannelId).catch(() => null)
  if (ch?.isTextBased()) ch.send(content)
}

function parseUserArg(guild, arg) {
  if (!arg) return null
  const id = arg.replace(/[<@!>]/g, '')
  return guild.members.cache.get(id)?.user ?? null
}

function parseTokenAmount(raw) {
  if (!raw) return NaN
  const n = Number(String(raw).replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function fmtUser(u) {
  return `**${u.username}** · locked ${u.locked.toLocaleString()} · unlocked ${u.unlocked.toLocaleString()} · claimed ${u.claimed.toLocaleString()}`
}

async function replyBotOwnerOnly(message, actor) {
  await message.reply(
    `Owner only. Add \`DISCORD_OWNER_IDS=${actor.id}\` to **web/.env.local**, restart the bot, then \`!whoami\`.`,
  )
}

async function handleTeamCodeCommand(message, args, actor, guild) {
  const sub = args.shift()?.toLowerCase()
  if (!sub || sub === 'help') {
    await message.reply(
      '**Team Space (owner):** `!teamcode create` · `!teamcode create @user` · `!teamcode list` · `!teamcode revoke CODE`',
    )
    return
  }
  if (sub === 'create') {
    if (!isOwner(actor.id)) {
      await replyBotOwnerOnly(message, actor)
      return
    }
    const target = args[0] ? parseUserArg(guild, args[0]) : null
    if (target) ensureUser(target.id, target.username)
    const row = createTeamActivationCode(
      actor.id,
      target?.id ?? null,
      target?.username ?? null,
    )
    await staffLog(
      `🔑 ${actor.tag} created Team Space code \`${row.code}\`${target ? ` for **${target.tag}**` : ''}`,
    )
    await message.reply(
      `Code: \`${row.code}\`\nOne-time · activate at eyesopen.to/team/activate · send code in DM only.`,
    )
    return
  }
  if (sub === 'list') {
    if (!isOwner(actor.id)) {
      await replyBotOwnerOnly(message, actor)
      return
    }
    const rows = listTeamActivationCodes(20)
    if (!rows.length) {
      await message.reply('No activation codes yet.')
      return
    }
    const lines = rows.map((r) => formatTeamCodeRow(r)).join('\n')
    await message.reply(lines.slice(0, 1900))
    return
  }
  if (sub === 'revoke') {
    if (!isOwner(actor.id)) {
      await replyBotOwnerOnly(message, actor)
      return
    }
    const codeArg = args[0]
    if (!codeArg) {
      await message.reply('Usage: !teamcode revoke TEAM-XXXXXXXX')
      return
    }
    const row = revokeTeamActivationCode(codeArg, actor.id)
    await staffLog(`🚫 ${actor.tag} revoked Team Space code \`${row.code}\``)
    await message.reply(`Revoked \`${row.code}\` (${row.status}).`)
    return
  }
  await message.reply('Unknown subcommand. Use `!teamcode help`.')
}

const TEAMCODE_SUBCOMMANDS = new Set(['create', 'list', 'revoke', 'help'])

/** Only one process may call client.login() per bot token — otherwise every command replies twice. */
function shouldRunDiscordGateway() {
  if (process.env.RAILWAY_ENVIRONMENT) return true
  if (process.env.RUN_LOCAL_DISCORD_BOT === 'true') return true
  return false
}

const runDiscordGateway = shouldRunDiscordGateway()

const BOT_VERSION = '2026-08-18-build-v3'

/** Discord client for staff log webhooks (set after gateway connects). */
let discordClientRef = null

client.on('ready', async () => {
  discordClientRef = client
  console.log(`Eyes Open bot logged in as ${client.user.tag} [${BOT_VERSION}]`)
  console.log('Discord gateway: ON (handles !commands)')
  console.log('Distributor: presale purchases + team !claim queue')
  logEnvSources()
  logEnvHealth()
  console.log('Commands: !help · !claim · !presalesend · !linkwallet')
  exportSnapshot()
  // Webhook already listening (started before login for Railway healthcheck)

  try {
    const dist = await getDistributorStatus()
    const pending = getPendingSendStats()
    console.log(
      `Send queue: ${pending.presale} presale · ${pending.team} team · distributor ${dist.distributorAddress ?? 'NOT SET'}`,
    )
    if (!dist.ready) {
      console.error('!presalesend NOT ready:', dist.issues.join(' | '))
      await staffLog(
        `⚠️ **!presalesend not ready**\n${dist.issues.map((i) => `· ${i}`).join('\n')}`,
      )
    }
  } catch (err) {
    console.error('Distributor status check failed', err)
  }

  if (config.guildId) {
    try {
      const guild = await client.guilds.fetch(config.guildId)
      await refreshInviteCache(guild)
      console.log(`Invite cache loaded for ${guild.name}`)
    } catch (err) {
      console.error('Failed to load invite cache — bot needs Manage Server permission', err)
    }
  }
})

client.on('inviteCreate', (invite) => {
  if (config.guildId && invite.guild?.id !== config.guildId) return
  cacheInvite(invite)
})

client.on('inviteDelete', (invite) => {
  removeInviteFromCache(invite)
})

client.on('guildMemberAdd', async (member) => {
  if (config.guildId && member.guild.id !== config.guildId) return

  ensureUser(member.id, member.user.username)

  try {
    const usedInvite = await findUsedInvite(member.guild)
    if (!usedInvite?.inviter || usedInvite.inviter.bot) return

    const inviterId = usedInvite.inviter.id
    if (inviterId === member.id) return
    if (!isDiscordInviteTrackingEnabled(inviterId)) return

    recordDiscordInviteJoin(inviterId, member.id, member.user.username)

    const reward = config.rewards.discordInvite.toLocaleString()
    await staffLog(
      `📨 **Discord invite join** · ${member.user.tag} joined via **${usedInvite.inviter.tag}** · +${reward} locked $EYES`,
    )
  } catch (err) {
    console.error('guildMemberAdd invite tracking failed', err)
  }
})

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return

  const args = message.content.slice(1).trim().split(/\s+/)
  const cmd = args.shift()?.toLowerCase()
  const guild = message.guild
  if (!guild) {
    await message.reply(
      'Commands work in the **server** only, not DMs.',
    )
    return
  }

  const actor = message.author
  ensureUser(actor.id, actor.username)

  try {
    switch (cmd) {
      case 'whoami': {
        const listed = isOwner(actor.id)
        await message.reply(
          `**${actor.tag}** · owner: **${listed ? 'yes ✓' : 'no'}**${
            listed ? '' : `\nAdd \`DISCORD_OWNER_IDS=${actor.id}\` to web/.env.local`
          }`,
        )
        break
      }

      case 'referral':
      case 'myref': {
        const user = getUserByDiscord(actor.id)
        const link = `${config.siteUrl}/presale?ref=${user.referral_code}`
        await message.reply(
          `Code: \`${user.referral_code}\`\n${link}\nLocked team-pool rewards on joins and presale registrations — not investment returns.`,
        )
        break
      }

      case 'refstats': {
        const targetUser = args[0] ? parseUserArg(guild, args[0]) : actor
        if (!targetUser) {
          await message.reply('User not found.')
          break
        }
        if (args[0] && !isOwner(actor.id)) {
          await message.reply('Owner only for other users.')
          break
        }
        const u = getUserByDiscord(targetUser.id)
        const embed = new EmbedBuilder()
          .setTitle(`Referral stats · ${u.username}`)
          .addFields(
            { name: 'Code', value: u.referral_code, inline: true },
            { name: 'Clicks', value: String(u.referral_clicks), inline: true },
            { name: 'Joins', value: String(u.referred_joins), inline: true },
            { name: 'Presale regs', value: String(u.referred_contributions), inline: true },
            { name: 'Discord invites', value: String(u.discord_invites), inline: true },
            {
              name: 'Auto invite rewards',
              value: u.discord_invite_tracking_enabled ? 'ON' : 'OFF',
              inline: true,
            },
            { name: 'Telegram invites', value: String(u.telegram_invites), inline: true },
            { name: 'Locked', value: u.locked.toLocaleString(), inline: true },
            { name: 'Unlocked', value: u.unlocked.toLocaleString(), inline: true },
          )
        await message.reply({ embeds: [embed] })
        break
      }

      case 'refclick': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const code = args[0]
        if (!code) {
          await message.reply('Usage: !refclick CODE')
          break
        }
        recordClick(code)
        await message.reply(`Recorded click for \`${code.toUpperCase()}\``)
        break
      }

      case 'give':
      case 'givelocked': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !givelocked @user amount')
          break
        }
        ensureUser(target.id, target.username)
        grantLocked(target.id, amount, cmd)
        await staffLog(`🔒 ${actor.tag} → ${target.tag}: +${amount} locked (${cmd})`)
        await message.reply(`+${amount.toLocaleString()} locked → **${target.username}**`)
        break
      }

      case 'giveunlocked':
      case 'giveraw': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !giveunlocked @user amount')
          break
        }
        ensureUser(target.id, target.username)
        grantUnlocked(target.id, amount, cmd)
        await staffLog(`🔓 ${actor.tag} → ${target.tag}: +${amount} unlocked (${cmd})`)
        await message.reply(`+${amount.toLocaleString()} unlocked → **${target.username}**`)
        break
      }

      case 'setallocation': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || Number.isNaN(amount)) {
          await message.reply('Usage: !setallocation @user amount')
          break
        }
        ensureUser(target.id, target.username)
        setAllocation(target.id, amount)
        await staffLog(`📊 ${actor.tag} set ${target.tag} allocation → ${amount}`)
        await message.reply(`Allocation → **${amount.toLocaleString()}** for ${target.username}`)
        break
      }

      case 'removeshare': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !removeshare @user amount')
          break
        }
        removeShare(target.id, amount, 'removeshare')
        await staffLog(`➖ ${actor.tag} removed ${amount} from ${target.tag}`)
        await message.reply(`−${amount.toLocaleString()} from **${target.username}**`)
        break
      }

      case 'teamreset': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        if (!target) {
          await message.reply('Usage: `!teamreset @user`')
          break
        }
        const before = getUserByDiscord(target.id)
        if (!before) ensureUser(target.id, target.username)
        const u = resetUserAllocation(target.id, actor.id, 'teamreset')
        await staffLog(
          `🔄 ${actor.tag} teamreset **${target.tag}** → 0 (was ${before?.total_allocated?.toLocaleString() ?? 0} allocated)`,
        )
        await message.reply(`Reset **${target.username}** to zero.`)
        break
      }

      case 'teamadd': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !teamadd @user amount')
          break
        }
        ensureUser(target.id, target.username)
        grantLocked(target.id, amount, 'teamadd')
        await staffLog(`👥 teamadd ${target.tag} +${amount} locked`)
        await message.reply(`+${amount.toLocaleString()} locked (team) → **${target.username}**`)
        break
      }

      case 'teamlock': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        await message.reply('Use `!givelocked` or `!teamadd`.')
        break
      }

      case 'teamunlock': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !teamunlock @user amount')
          break
        }
        if (amount >= config.largeUnlockThreshold) {
          await message.reply(
            `Large unlock — confirm: \`!teamconfirmunlock ${args[0]} ${amount}\``,
          )
          break
        }
        moveLockToUnlock(target.id, amount, 'teamunlock')
        await staffLog(`🔓 teamunlock ${target.tag} ${amount}`)
        await message.reply(`Unlocked **${amount.toLocaleString()}** → ${target.username}`)
        break
      }

      case 'teamconfirmunlock': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const amount = Number(args[1])
        if (!target || !amount) {
          await message.reply('Usage: !teamconfirmunlock @user amount')
          break
        }
        moveLockToUnlock(target.id, amount, 'teamconfirmunlock')
        await staffLog(`✅ CONFIRMED unlock ${target.tag} ${amount}`)
        await message.reply(`Confirmed **${amount.toLocaleString()}** → ${target.username}`)
        break
      }

      case 'teamstatus': {
        if (args[0] === 'all' && isOwner(actor.id)) {
          const users = db.prepare('SELECT * FROM users ORDER BY total_allocated DESC LIMIT 20').all()
          const lines = users.map((u) => fmtUser(u)).join('\n') || 'No users yet.'
          await message.reply(lines.slice(0, 1900))
          break
        }
        const target = args[0] ? parseUserArg(guild, args[0]) : actor
        if (!target) {
          await message.reply('User not found.')
          break
        }
        if (args[0] && !isOwner(actor.id)) {
          await message.reply('Owner only for other users.')
          break
        }
        const u = getUserByDiscord(target.id)
        let line = fmtUser(u)
        if (u.wallet_address) {
          line += '\nWallet: **linked**'
        } else if (u.unlocked > 0) {
          line += '\nWallet: **not linked** — `!linkwallet` then `!claim`'
        }
        await message.reply(line)
        break
      }

      case 'teamleaderboard': {
        const users = db.prepare('SELECT * FROM users ORDER BY total_allocated DESC LIMIT 10').all()
        const lines = users.map((u, i) => `${i + 1}. ${fmtUser(u)}`).join('\n') || 'Empty.'
        await message.reply(lines.slice(0, 1900))
        break
      }

      case 'teamcheckmcap': {
        await message.reply(
          'Team pool unlock tiers (internal vesting — not presale or investment returns):\n$100K · $500K · $1M · $5M\nOwner verifies on-chain, then `!teamunlockmcap` + `!teamconfirmunlock`.',
        )
        break
      }

      case 'teamunlockmcap': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        await message.reply('Mcap tier marked eligible (logged). Use `!teamconfirmunlock @user amount`.')
        logAudit('mcap_unlock_eligible', actor.id, null, null, args.join(' '))
        break
      }

      case 'discordinvite': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        if (!target) {
          await message.reply('Usage: `!discordinvite @user`')
          break
        }
        ensureUser(target.id, target.username)

        if (isDiscordInviteTrackingEnabled(target.id)) {
          await message.reply(`Invite rewards already **ON** for **${target.username}**.`)
          break
        }

        enableDiscordInviteTracking(target.id, actor.id)

        if (config.guildId) {
          const guildRef = await client.guilds.fetch(config.guildId).catch(() => null)
          if (guildRef) await refreshInviteCache(guildRef)
        }

        await staffLog(
          `✅ ${actor.tag} enabled Discord invite auto-rewards for **${target.tag}** (+${config.rewards.discordInvite.toLocaleString()} locked/join)`,
        )
        await message.reply(
          `Invite rewards **ON** for **${target.username}** (+${config.rewards.discordInvite.toLocaleString()} locked/join via their invite).`,
        )
        break
      }

      case 'telegraminvite': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        if (!target) {
          await message.reply('Usage: !telegraminvite @user')
          break
        }
        ensureUser(target.id, target.username)
        db.prepare(
          'UPDATE users SET telegram_invites = telegram_invites + 1, updated_at = ? WHERE discord_id = ?',
        ).run(new Date().toISOString(), target.id)
        grantLocked(target.id, config.rewards.telegramInvite, 'telegram_invite')
        exportSnapshot()
        await message.reply(`+1 Telegram invite reward for ${target.username}`)
        break
      }

      case 'linkwallet': {
        const wallet = args[0]
        if (!wallet?.startsWith('0x')) {
          await message.reply('Usage: `!linkwallet 0x…`')
          break
        }
        db.prepare(
          'UPDATE users SET wallet_address = ?, updated_at = ? WHERE discord_id = ?',
        ).run(wallet, new Date().toISOString(), actor.id)
        exportSnapshot()
        await message.reply('Wallet linked ✓')
        break
      }

      case 'claim': {
        const amount = parseTokenAmount(args[0])
        if (!Number.isFinite(amount) || amount <= 0) {
          await message.reply('Usage: `!claim amount` — link wallet first with `!linkwallet`.')
          break
        }
        ensureUser(actor.id, actor.username)
        const claim = createTeamTokenClaim(actor.id, amount)
        const user = getUserByDiscord(actor.id)
        await message.reply(
          [
            `Claim queued · #${claim.id} · ${amount.toLocaleString()} $EYES`,
            `Unlocked left: **${user.unlocked.toLocaleString()}**`,
            'Sends on next `!presalesend run`.',
          ].join('\n'),
        )
        await staffLog(
          `Team claim #${claim.id} · ${actor.username} · ${amount.toLocaleString()} $EYES`,
        )
        break
      }

      case 'sendstatus': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const pending = getPendingSendStats()
        const dist = await getDistributorStatus()
        await message.reply(
          [
            `Pending: **${pending.presale}** presale · **${pending.team}** team`,
            `Treasury key: **${dist.matchesTreasury ? 'ok ✓' : 'mismatch ✗'}**`,
            `Balance: **${dist.balanceEyes ?? '?'}** $EYES · **${dist.balanceEth ?? '?'}** ETH`,
            dist.ready ? '✅ Ready — `!presalesend run`' : `❌ ${dist.issues.join(' · ')}`,
          ].join('\n'),
        )
        break
      }

      case 'keycheck': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const raw = process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY ?? ''
        const check = inspectPrivateKeyEnv(raw, 'PRESALE_DISTRIBUTOR_PRIVATE_KEY')
        const lines = [
          `Key set: **${check.set ? 'yes' : 'no'}** · length **${check.rawLength}**`,
        ]
        if (check.valid && check.normalized) {
          const account = privateKeyToAccount(check.normalized)
          const treasury = getTreasuryAddress()
          const matches = account.address.toLowerCase() === treasury
          lines.push(`Parse: **ok** · treasury match: **${matches ? 'yes ✓' : 'no ✗'}**`)
        } else {
          lines.push(`Parse error: ${check.error}`)
        }
        await message.reply(lines.join('\n'))
        break
      }

      case 'presalesend':
      case 'presaledistribute': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const mode = args[0]?.toLowerCase()
        const dryRun = mode !== 'run'
        const limit = args[1] ? Number(args[1]) : undefined
        const pending = getPendingSendStats()
        if (pending.total === 0) {
          await message.reply(
            'Nothing queued.\nPresale: register on site · Team: `!linkwallet` + `!claim`',
          )
          break
        }
        const dist = await getDistributorStatus()
        if (!dist.ready) {
          await message.reply(`Cannot send — ${dist.issues.join(' · ')}`)
          break
        }
        await message.reply(dryRun ? 'Dry run…' : `Sending (limit ${limit ?? 'default'})…`)
        const result = await distributePresaleTokens({ dryRun, limit })
        const lines = [`${dryRun ? 'Dry run' : 'Sent'} · ${result.message}`]
        for (const s of result.sent ?? []) {
          const tag = s.type === 'team' ? 'team' : 'presale'
          lines.push(
            dryRun
              ? `· ${tag} #${s.id} · ${s.tokens.toLocaleString()} $EYES`
              : `· ${tag} #${s.id} · ${s.tokens.toLocaleString()} $EYES · tx \`${s.txHash?.slice(0, 10)}…\``,
          )
        }
        for (const s of result.skipped ?? []) {
          const tag = s.type === 'team' ? 'team' : 'presale'
          lines.push(`· ${tag} #${s.id} skipped — ${s.reason}`)
        }
        await message.reply(lines.join('\n').slice(0, 1900))
        break
      }

      case 'team': {
        const first = args[0]?.toLowerCase()
        if (first === 'code' || first === 'teamcode') {
          args.shift()
        }
        if (!args.length || TEAMCODE_SUBCOMMANDS.has(first ?? '') || TEAMCODE_SUBCOMMANDS.has(args[0]?.toLowerCase() ?? '')) {
          await handleTeamCodeCommand(message, args, actor, guild)
          break
        }
        await message.reply(
          '**Team Space:** `!teamcode create` · `!teamcode list`\n**Team pool:** `!teamadd` · `!teamunlock` · `!teamstatus` · `!claim`',
        )
        break
      }

      case 'teamcode': {
        await handleTeamCodeCommand(message, args, actor, guild)
        break
      }

      case 'poolhelp':
      case 'commands':
      case 'help': {
        const embeds = buildHelpEmbeds(isOwner(actor.id))
        await message.reply({ embeds })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(err)
    await message.reply(`Error: ${err.message}`).catch(() => {})
  }
})

if (runDiscordGateway) {
  // Listen before Discord connects so Railway /health passes during deploy.
  startWebhookServer(() => discordClientRef)
  client.login(config.token)
} else {
  console.log(
    'Discord gateway OFF (webhook-only) — avoids double replies while Railway bot is live.',
  )
  console.log('Set RUN_LOCAL_DISCORD_BOT=true to handle !commands on this machine.')
  logEnvSources()
  logEnvHealth()
  exportSnapshot()
  startWebhookServer(null)
}

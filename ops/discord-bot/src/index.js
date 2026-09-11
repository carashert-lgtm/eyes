import './load-env.js'
import { logEnvHealth, logEnvSources } from './load-env.js'
import { migrateRetentionLedger } from './retention-store.js'

migrateRetentionLedger()
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
  getPresalePurchasesByWallet,
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
import { BOT_VERSION } from './bot-version.js'
import { privateKeyToAccount } from 'viem/accounts'
import {
  createTeamActivationCode,
  formatTeamCodeRow,
  listTeamActivationCodes,
  revokeTeamActivationCode,
} from './team-codes.js'
import {
  clearModLogChannel,
  getModLogChannelId,
  handleProfanityFilter,
  setModLogChannel,
} from './moderation.js'
import {
  linkWalletDirect,
  redeemWalletLinkCode,
  unlinkUserWallet,
  normalizeCode,
} from './wallet-link.js'
import {
  queueDiscordSend,
  executeDiscordSend,
  listPendingDiscordSends,
  getDiscordSend,
  getDiscordSenderStatus,
} from './discord-send.js'
import { formatLpcStatus, lpcRequest } from './lpc.js'

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
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.GuildMember],
})

async function staffLog(content) {
  if (!config.staffLogChannelId) return
  try {
    const ch = await client.channels.fetch(config.staffLogChannelId).catch(() => null)
    if (ch?.isTextBased()) await ch.send(content)
  } catch (err) {
    console.warn('staffLog failed (check bot can view/send in staff log channel):', err.message)
  }
}

function parseUserArg(guild, arg) {
  if (!arg) return null
  const id = arg.replace(/[<@!>]/g, '')
  return guild.members.cache.get(id)?.user ?? null
}

function parseRoleArg(guild, arg) {
  if (!arg) return null
  const id = arg.replace(/[<@&>]/g, '')
  return guild.roles.cache.get(id) ?? null
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

/** Discord client for staff log webhooks (set after gateway connects). */
let discordClientRef = null

client.on('ready', async () => {
  discordClientRef = client
  console.log(`Eyes Open bot logged in as ${client.user.tag} [${BOT_VERSION}]`)
  console.log('Discord gateway: ON (handles !commands)')
  console.log('Distributor: presale purchases + team !claim queue')
  logEnvSources()
  logEnvHealth()
  console.log('Commands: !help · !presalestatus · !claim · !presalesend · !linkwallet')
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
        `⚠️ **!presalesend not ready**\n${dist.issues.map((i) => `· ${i.split('\n')[0]}`).join('\n')}`,
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
      await staffLog(
        [
          '✅ **Eyes Warden online**',
          `Version \`${BOT_VERSION}\` · guild **${guild.name}**`,
          'Everyone: `!help` · `!linkwallet` · `!presalestatus` · `!myref`',
          'Owner: `!whoami` · `!sendstatus` · `!presalesend`',
          'Music stays on **Bradley** → `/play` (slash, not `!`)',
        ].join('\n'),
      )
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

function fmtPresaleStatus(p) {
  const statusLabel =
    p.status === 'sent'
      ? 'sent ✓'
      : p.status === 'sending'
        ? 'sending…'
        : p.status === 'failed'
          ? 'failed ✗'
          : 'queued'
  return [
    `#${p.id} · **${p.tierLabel ?? `Tier ${p.tierId}`}** · ${p.tokensOwed.toLocaleString()} $EYES`,
    `${p.ethAmount} ETH · ${statusLabel}`,
  ].join('\n')
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  if (config.guildId && message.guild?.id !== config.guildId) return

  if (await handleProfanityFilter(message)) return

  if (!message.content.startsWith('!')) return

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
        const arg = args[0]
        if (!arg) {
          await message.reply(
            [
              '**Link your wallet for presale status + bot sends**',
              '1. Connect wallet on **eyesopen.to/app/profile**',
              '2. Tap **Generate Discord link code**',
              '3. Run `!linkwallet EYES-…` here',
              '',
              'Or direct: `!linkwallet 0xYourAddress`',
            ].join('\n'),
          )
          break
        }
        ensureUser(actor.id, actor.username)
        try {
          if (normalizeCode(arg) || arg.toUpperCase().startsWith('EYES-')) {
            const { walletAddress, code } = redeemWalletLinkCode(actor.id, actor.username, arg)
            await message.reply(`Wallet linked ✓ · \`${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}\` · code \`${code}\``)
            await staffLog(`Wallet link · ${actor.username} · ${walletAddress}`)
            break
          }
          if (!arg.startsWith('0x')) {
            await message.reply('Usage: `!linkwallet EYES-…` or `!linkwallet 0x…`')
            break
          }
          linkWalletDirect(actor.id, actor.username, arg)
          await message.reply('Wallet linked ✓')
          await staffLog(`Wallet link (direct) · ${actor.username} · ${arg}`)
        } catch (err) {
          await message.reply(`Link failed: ${err.message}`)
        }
        break
      }

      case 'mywallet': {
        ensureUser(actor.id, actor.username)
        const user = getUserByDiscord(actor.id)
        if (!user?.wallet_address) {
          await message.reply('No wallet linked. Use **eyesopen.to/app/profile** → Generate code → `!linkwallet EYES-…`')
          break
        }
        await message.reply(`Linked wallet: \`${user.wallet_address}\``)
        break
      }

      case 'unlinkwallet': {
        unlinkUserWallet(actor.id)
        await message.reply('Wallet unlinked from your Discord account.')
        break
      }

      case 'setwallet': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const wallet = args[1]
        if (!target || !wallet?.startsWith('0x')) {
          await message.reply('Usage: `!setwallet @user 0x…`')
          break
        }
        linkWalletDirect(target.id, target.username, wallet)
        await message.reply(`Set wallet for **${target.username}**`)
        await staffLog(`Owner setwallet · ${actor.username} → ${target.username} · ${wallet}`)
        break
      }

      case 'walletof': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        if (!target) {
          await message.reply('Usage: `!walletof @user`')
          break
        }
        const user = getUserByDiscord(target.id)
        await message.reply(
          user?.wallet_address
            ? `**${target.username}** → \`${user.wallet_address}\``
            : `**${target.username}** has no linked wallet.`,
        )
        break
      }

      case 'sendeyes':
      case 'sendtoken': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const sub = args[0]?.toLowerCase()
        if (sub === 'confirm' && args[1]) {
          const id = Number(args[1])
          if (!Number.isFinite(id)) {
            await message.reply('Usage: `!sendeyes confirm ID`')
            break
          }
          try {
            const result = await executeDiscordSend(id, { force: true })
            await message.reply(`Sent ✓ #${id} · tx \`${result.txHash}\``)
            await staffLog(`sendeyes confirm #${id} · ${result.txHash} · by ${actor.username}`)
          } catch (err) {
            await message.reply(`Send failed: ${err.message}`)
          }
          break
        }
        if (sub === 'dry' && args[1]) {
          const id = Number(args[1])
          try {
            const result = await executeDiscordSend(id, { dryRun: true, force: true })
            await message.reply(
              `Dry run #${id} · ${result.amount ?? result.send?.amount} $EYES → \`${result.to ?? result.send?.walletAddress}\``,
            )
          } catch (err) {
            await message.reply(`Dry run failed: ${err.message}`)
          }
          break
        }
        if (sub === 'pending' || sub === 'list') {
          const pending = listPendingDiscordSends(15)
          if (!pending.length) {
            await message.reply('No pending Discord sends.')
            break
          }
          const lines = pending.map(
            (p) => `#${p.id} · ${p.status} · ${p.amount.toLocaleString()} → \`${p.walletAddress.slice(0, 8)}…\``,
          )
          await message.reply(['Pending sends:', ...lines].join('\n').slice(0, 1900))
          break
        }

        const target = parseUserArg(guild, args[0])
        const amount = parseTokenAmount(args[1])
        const tokenArg = cmd === 'sendtoken' ? args[2] : null
        if (!target || !Number.isFinite(amount) || amount <= 0) {
          await message.reply(
            cmd === 'sendtoken'
              ? 'Usage: `!sendtoken @user AMOUNT 0xToken` · `!sendeyes pending`'
              : 'Usage: `!sendeyes @user AMOUNT` · confirm: `!sendeyes confirm ID`',
          )
          break
        }
        const user = getUserByDiscord(target.id)
        if (!user?.wallet_address) {
          await message.reply(`${target.username} has no linked wallet.`)
          break
        }
        const tokenAddress =
          tokenArg?.startsWith('0x') ? tokenArg : (process.env.EYES_TOKEN_ADDRESS ?? '')
        if (!tokenAddress) {
          await message.reply('EYES_TOKEN_ADDRESS not configured.')
          break
        }
        const { id, status } = queueDiscordSend({
          discordId: target.id,
          walletAddress: user.wallet_address,
          tokenAddress,
          amount,
          actorId: actor.id,
          note: `${cmd} by ${actor.username}`,
        })
        if (status === 'awaiting_confirm') {
          await message.reply(
            `Large send queued **#${id}** · ${amount.toLocaleString()} $EYES → ${target.username}\nConfirm: \`!sendeyes confirm ${id}\``,
          )
          break
        }
        try {
          const result = await executeDiscordSend(id)
          if (result.dryRun) {
            await message.reply(`Dry run #${id} — set DISCORD_SEND_DRY_RUN=false to send live.`)
            break
          }
          await message.reply(
            `Sent ✓ **${amount.toLocaleString()}** $EYES → ${target.username} · \`${result.txHash?.slice(0, 10)}…\``,
          )
          await staffLog(`sendeyes #${id} · ${amount} → ${user.wallet_address} · ${result.txHash}`)
        } catch (err) {
          await message.reply(`Queued #${id} but send failed: ${err.message}`)
        }
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
        const lookupId = Number(args[0])
        if (args[0] && Number.isFinite(lookupId)) {
          const row = getDiscordSend(lookupId)
          if (!row) {
            await message.reply(`Send #${lookupId} not found.`)
            break
          }
          await message.reply(
            [
              `#${row.id} · **${row.status}**`,
              `Amount: ${row.amount.toLocaleString()}`,
              `Wallet: \`${row.walletAddress}\``,
              row.txHash ? `Tx: \`${row.txHash}\`` : '',
              row.error ? `Error: ${row.error}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          )
          break
        }
        const pending = getPendingSendStats()
        const dist = await getDistributorStatus()
        const manual = await getDiscordSenderStatus()
        await message.reply(
          [
            `Pending: **${pending.presale}** presale · **${pending.team}** team · **${manual.pending}** manual`,
            `Chain: **${dist.chainId}** (${dist.rpcMode ?? '?'}) · token \`${dist.tokenAddress ? `${dist.tokenAddress.slice(0, 8)}…` : 'unset'}\``,
            `Treasury key: **${dist.matchesTreasury ? 'ok ✓' : 'mismatch ✗'}**`,
            `Balance: **${dist.balanceEyes ?? '?'}** $EYES · **${dist.balanceEth ?? '?'}** ETH`,
            `Manual sender: \`${manual.senderAddress?.slice(0, 8) ?? '?'}…\` · ${manual.balanceEyes ?? '?'} $EYES`,
            dist.ready ? '✅ Ready — `!presalesend run`' : `❌ ${dist.issues.join(' · ')}`,
            manual.dryRun ? '⚠️ DISCORD_SEND_DRY_RUN=true' : '',
          ]
            .filter(Boolean)
            .join('\n'),
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

      case 'giverole': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const target = parseUserArg(guild, args[0])
        const role = parseRoleArg(guild, args[1])
        if (!target || !role) {
          await message.reply('Usage: `!giverole @user @role`')
          break
        }
        const member = await guild.members.fetch(target.id).catch(() => null)
        if (!member) {
          await message.reply('Member not found in this server.')
          break
        }
        const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null))
        if (!botMember?.permissions.has('ManageRoles')) {
          await message.reply('I need **Manage Roles** permission.')
          break
        }
        if (role.managed) {
          await message.reply('That role is managed by an integration — assign it in Discord settings.')
          break
        }
        if (role.position >= botMember.roles.highest.position) {
          await message.reply('Move my bot role above that role in Server Settings → Roles.')
          break
        }
        if (member.roles.cache.has(role.id)) {
          await message.reply(`**${target.username}** already has **${role.name}**.`)
          break
        }
        await member.roles.add(role, `!giverole by ${actor.tag}`)
        logAudit('giverole', actor.id, target.id, null, role.name)
        await staffLog(`🎭 ${actor.tag} gave **${role.name}** → **${target.tag}**`)
        await message.reply(`Gave **${role.name}** → **${target.username}**`)
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

      case 'presalestatus':
      case 'mypresale': {
        const user = getUserByDiscord(actor.id)
        let wallet = user.wallet_address
        if (args[0]?.startsWith('0x')) {
          if (!isOwner(actor.id)) {
            await message.reply('Owner only when checking another wallet.')
            break
          }
          wallet = args[0]
        }
        if (!wallet?.startsWith('0x')) {
          await message.reply(
            'Link your wallet first: `!linkwallet 0x…`\nPresale status uses the wallet you registered on **eyesopen.to/presale**.',
          )
          break
        }
        const purchases = getPresalePurchasesByWallet(wallet)
        if (!purchases.length) {
          await message.reply(
            'No presale registration found for your linked wallet.\nContribute at **eyesopen.to/presale**, then register your payment wallet on the site.',
          )
          break
        }
        const lines = purchases.map(fmtPresaleStatus)
        await message.reply(
          [
            `Presale · ${purchases.length} registration(s)`,
            ...lines,
            purchases.some((p) => p.status !== 'sent')
              ? '\nQueued sends run on staff `!presalesend run`.'
              : '',
          ]
            .filter(Boolean)
            .join('\n')
            .slice(0, 1900),
        )
        break
      }

      case 'setmodlog': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const channel = message.mentions.channels.first()
        if (!channel?.isTextBased()) {
          await message.reply('Usage: `!setmodlog #channel`')
          break
        }
        setModLogChannel(guild.id, channel.id)
        await message.reply(`Mod log channel → ${channel}`)
        break
      }

      case 'modlogstatus': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        const logId = getModLogChannelId(guild.id)
        if (!logId) {
          await message.reply('No mod log channel set. Use `!setmodlog #channel`.')
          break
        }
        const ch = await guild.channels.fetch(logId).catch(() => null)
        await message.reply(ch ? `Mod log: ${ch}` : 'Mod log channel missing — set again with `!setmodlog`.')
        break
      }

      case 'xlist': {
        const data = await lpcRequest('/warden/list', { discordId: actor.id })
        const rows = (data.tokens || []).map(
          (t) =>
            `$${t.ticker} — ${t.linked ? 'linked' : 'not linked'}, auto ${t.auto ? 'on' : 'off'}`,
        )
        await message.reply(
          rows.length
            ? `**${data.seat || 'Your seat'}**\n${rows.join('\n')}`
            : 'No X accounts on your Launchpad Command seat.',
        )
        break
      }

      case 'xstatus': {
        const data = await lpcRequest(`/warden/status?ticker=${encodeURIComponent(args[0] || '')}`, {
          discordId: actor.id,
        })
        await message.reply(formatLpcStatus(data))
        break
      }

      case 'xcheck': {
        const data = await lpcRequest(`/warden/check?ticker=${encodeURIComponent(args[0] || '')}`, {
          discordId: actor.id,
        })
        const head = data.ok ? 'OK' : 'ISSUES'
        const body = (data.lines || []).join('\n')
        await message.reply(`${head}\n${body}`.slice(0, 1800))
        break
      }

      case 'xpost': {
        await message.reply(`Forcing one auto post${args[0] ? ` for $${args[0]}` : ''}…`)
        const posted = await lpcRequest('/warden/post', {
          method: 'POST',
          body: { ticker: args[0] || '' },
          discordId: actor.id,
        })
        await message.reply(`Posted: ${(posted.body || '').slice(0, 200)}`)
        break
      }

      case 'xboost': {
        await lpcRequest('/warden/boost', {
          method: 'POST',
          body: { ticker: args[0] || '' },
          discordId: actor.id,
        })
        const status = await lpcRequest(`/warden/status?ticker=${encodeURIComponent(args[0] || '')}`, {
          discordId: actor.id,
        })
        await message.reply(formatLpcStatus(status))
        break
      }

      case 'clearmodlog': {
        if (!isOwner(actor.id)) {
          await message.reply('Owner only.')
          break
        }
        clearModLogChannel(guild.id)
        await message.reply('Mod log channel cleared (falls back to staff log env if set).')
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

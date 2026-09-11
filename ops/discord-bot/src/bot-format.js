import { EmbedBuilder } from 'discord.js'

export function getTreasuryAddress() {
  return (
    process.env.EYES_TREASURY ??
    process.env.NEXT_PUBLIC_PRESALE_RECIPIENT ??
    '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'
  ).toLowerCase()
}

/** Short `0x1234…abcd` — staff logs only; avoid in public channels. */
export function shortAddress(addr, fallback = '—') {
  if (!addr || typeof addr !== 'string') return fallback
  const a = addr.trim()
  if (!a.startsWith('0x') || a.length < 10) return fallback
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export const GAS_FUND_HINT = 'Treasury needs ~0.001 ETH on Base for gas.'

export function buildHelpEmbeds(isOwner) {
  const everyone = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle('Eyes Open · commands')
    .setDescription(
      [
        '**Presale** — contribute at eyesopen.to/presale, then `!presalestatus`',
        '**Team pool** — `!linkwallet` once, then `!claim amount` for unlocked tokens',
        'Not financial advice · not an investment product.',
      ].join('\n'),
    )
    .addFields(
      {
        name: 'Referral',
        value: '`!myref` · `!refstats`',
        inline: true,
      },
      {
        name: 'Team',
        value: '`!teamstatus` · `!teamleaderboard`',
        inline: true,
      },
      {
        name: 'Wallet / presale',
        value: '`!linkwallet` · `!mywallet` · `!presalestatus`',
        inline: true,
      },
      {
        name: 'Team Space',
        value: 'Staff code → activate on site (`/team/activate`).',
        inline: false,
      },
      {
        name: 'Your X (Launchpad Command)',
        value:
          '`!xlist` · `!xstatus TICKER` · `!xcheck TICKER` · `!xpost TICKER` · `!xboost TICKER`\nOnly the X account linked on your LPC seat.',
        inline: false,
      },
    )
    .setFooter({ text: '!help' })

  if (!isOwner) return [everyone]

  const owner = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('Owner')
    .addFields(
      {
        name: 'Sends',
        value:
          '`!sendstatus` · `!presalesend run` · `!sendeyes @user AMOUNT`\n`!sendeyes pending` · `!sendeyes confirm ID` · `!walletof @user`',
        inline: false,
      },
      {
        name: 'Team pool',
        value:
          '`!teamadd` · `!teamunlock` · `!teamconfirmunlock`\n`!givelocked` · `!giveunlocked` · `!teamreset`',
        inline: false,
      },
      {
        name: 'Team Space',
        value: '`!teamcode create` · `!teamcode list` · `!teamcode revoke`',
        inline: false,
      },
      {
        name: 'Ops',
        value:
          '`!discordinvite` · `!telegraminvite` · `!refclick` · `!giverole` · `!whoami`',
        inline: false,
      },
      {
        name: 'Launchpad Command (X)',
        value:
          'Same `!x` commands as everyone — each Discord id can only move its own linked X account.',
        inline: false,
      },
      {
        name: 'Moderation',
        value: '`!setmodlog #channel` · `!modlogstatus` · `!clearmodlog`',
        inline: false,
      },
    )

  return [everyone, owner]
}

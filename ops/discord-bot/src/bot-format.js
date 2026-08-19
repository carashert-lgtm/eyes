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
        '**Team pool** — `!linkwallet` once, then `!claim amount` for unlocked tokens.',
        '**Presale** — register on the site; tier allocation sends after owner runs `!presalesend`.',
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
        name: 'Wallet',
        value: '`!linkwallet 0x…`',
        inline: true,
      },
      {
        name: 'Team Space',
        value: 'Staff code → activate on site (`/team/activate`).',
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
        value: '`!sendstatus` · `!keycheck` · `!presalesend` · `!presalesend run`',
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
        value: '`!discordinvite` · `!telegraminvite` · `!refclick` · `!giverole` · `!whoami`',
        inline: false,
      },
    )

  return [everyone, owner]
}

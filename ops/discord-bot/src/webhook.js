import { createServer } from 'http'
import {
  config,
  exportSnapshot,
  getPendingSendStats,
  getUserByCode,
  grantLocked,
  logAudit,
  recordClick,
  registerPresalePurchase,
  getPresaleByTxHash,
  getPresaleStats,
  db,
} from './db.js'
import { activateTeamCode, validateTeamSession } from './team-codes.js'

const BOT_FEATURES = ['claim', 'presalesend', 'team-claims-queue']

async function staffLog(client, content) {
  if (!config.staffLogChannelId || !client) return
  const ch = await client.channels.fetch(config.staffLogChannelId).catch(() => null)
  if (ch?.isTextBased()) ch.send(content)
}

let webhookServerStarted = false

export function startWebhookServer(discordClient = null) {
  if (webhookServerStarted) return
  webhookServerStarted = true

  const port = Number(process.env.PORT ?? process.env.WEBHOOK_PORT ?? '3847')
  const host = process.env.HOST ?? '0.0.0.0'
  const secret = process.env.PLATFORM_API_SECRET ?? ''

  const resolveClient = () =>
    typeof discordClient === 'function' ? discordClient() : discordClient

  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      let teamCodesActive = 0
      try {
        teamCodesActive =
          db.prepare(
            "SELECT COUNT(*) AS n FROM team_activation_codes WHERE status = 'active'",
          ).get()?.n ?? 0
      } catch {
        // team tables may not exist yet on first boot
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          service: 'eyes-bot-webhook',
          features: BOT_FEATURES,
          teamCodesActive,
          discordReady: Boolean(resolveClient()?.user),
          pending: getPendingSendStats(),
        }),
      )
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(404)
      res.end()
      return
    }

    const auth = req.headers['x-platform-secret']
    if (secret && auth !== secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    let body = ''
    for await (const chunk of req) body += chunk

    let data
    try {
      data = JSON.parse(body)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    try {
      if (req.url === '/webhook/referral-click') {
        const code = data.referralCode
        if (!code) throw new Error('referralCode required')
        recordClick(code)
        await staffLog(resolveClient(), `🔗 Referral click recorded for \`${code}\``)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }

      if (req.url === '/webhook/team-activate') {
        const { code, clientIp } = data
        if (!code) throw new Error('code required')
        const result = activateTeamCode(code, clientIp ?? 'unknown')
        await staffLog(
          resolveClient(),
          `🔐 Team Space activated · code \`${result.code}\`${result.username ? ` · **${result.username}**` : ''}`,
        )
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/team-session') {
        const { token } = data
        const session = validateTeamSession(token)
        if (!session) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Invalid session' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, session }))
        return
      }

      if (req.url === '/webhook/presale/register') {
        const result = registerPresalePurchase(data)
        const p = result.purchase
        await staffLog(
          resolveClient(),
          result.duplicate
            ? `ℹ️ Presale register duplicate \`${p.txHash.slice(0, 10)}…\``
            : `✅ Presale registered · ${p.tokensOwed.toLocaleString()} $EYES · ${p.ethAmount} ETH`,
        )
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/presale/lookup') {
        const { txHash } = data
        if (!txHash) throw new Error('txHash required')
        const purchase = getPresaleByTxHash(txHash)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, purchase }))
        return
      }

      if (req.url === '/webhook/presale/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, stats: getPresaleStats() }))
        return
      }

      if (req.url === '/webhook/presale/distribute') {
        const { distributePresaleTokens } = await import('./presale-distribute.js')
        const dryRun = data.dryRun !== false && data.run !== true
        const limit = data.limit != null ? Number(data.limit) : undefined
        const result = await distributePresaleTokens({ dryRun, limit })
        if (!dryRun && result.sent?.length) {
          await staffLog(
            resolveClient(),
            `📤 Presale distribute · sent **${result.sent.length}** · skipped ${result.skipped?.length ?? 0}`,
          )
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/contribute') {
        const { referralCode, txHash, wallet } = data
        if (!txHash || !wallet) throw new Error('txHash and wallet required')

        if (referralCode) {
          const referrer = getUserByCode(referralCode)
          if (referrer) {
            const now = new Date().toISOString()
            db.prepare(
              'UPDATE users SET referred_contributions = referred_contributions + 1, updated_at = ? WHERE discord_id = ?',
            ).run(now, referrer.discord_id)
            grantLocked(
              referrer.discord_id,
              config.rewards.referredContribution,
              `contribution:${txHash}`,
            )
          }
        }

        logAudit('presale_contribute', wallet, referralCode ?? null, null, txHash)
        exportSnapshot()
        await staffLog(
          resolveClient(),
          `💰 Presale contribution · tx \`${txHash.slice(0, 10)}…\`${referralCode ? ` · ref \`${referralCode}\`` : ''}`,
        )
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }

      res.writeHead(404)
      res.end()
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(
        `Webhook port :${port} already in use — stop the other bot terminal (Ctrl+C) or run:`,
      )
      console.warn(`  netstat -ano | findstr :${port}`)
      console.warn(`  taskkill /PID <pid> /F`)
      console.warn(
        'Discord commands still work; Team Space activation on the website needs this webhook.',
      )
      return
    }
    console.error('Webhook server error:', err)
  })

  server.listen(port, host, () => {
    console.log(`Webhook server on http://${host}:${port}`)
  })
}

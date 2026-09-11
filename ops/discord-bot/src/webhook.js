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
  upsertAppAccount,
  getAppAccountByGoogleId,
  getAppAccountByEmail,
  subscribeEmailAccount,
  linkAppAccount,
  updateAppAccountPreferences,
  getAppAccountProfile,
  createEyesAccount,
  updateEyesAccountSolanaAddress,
  getEyesAccountAuthByEmail,
  getAppAccountById,
  registerLaunchMetadata,
  listLaunchMetadata,
  hasBoostNotification,
  recordBoostNotification,
  changeEyesAccountPassword,
  getAccountSettings,
  updateAccountSettings,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getApiKeyAuth,
  listApiKeyUsage,
  createPasswordResetToken,
  consumePasswordResetToken,
  exportAccountData,
  deleteAccount,
  createOAuthApp,
  listOAuthApps,
  createOAuthCode,
  exchangeOAuthCode,
  db,
} from './db.js'
import { postBoostToLaunches } from './boost-discord.js'
import {
  getRetentionLedger,
  recordBoostRecord,
  recordLaunchFeeRecord,
  upsertRetentionAlerts,
} from './retention-store.js'
import { activateTeamCode, validateTeamSession } from './team-codes.js'
import { createWalletLinkCode, getWalletLinkStatus } from './wallet-link.js'
import { BOT_VERSION } from './bot-version.js'
import { setRegisteredLpcHost } from './lpc.js'
import { finishLpcJob, takeLpcJobs } from './lpc-jobs.js'

const BOT_FEATURES = ['claim', 'presalesend', 'team-claims-queue', 'account-email', 'wallet-link', 'discord-send', 'eyes-account', 'boost-notify', 'retention-ledger', 'settings-api']

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
          version: BOT_VERSION,
          features: BOT_FEATURES,
          teamCodesActive,
          discordReady: Boolean(resolveClient()?.user),
          pending: getPendingSendStats(),
        }),
      )
      return
    }

    if (req.method === 'POST' && req.url === '/lpc/register') {
      const key = String(req.headers['x-lpc-key'] || '')
      const expected = (process.env.LPC_BOT_KEY || '').trim()
      if (!expected || key !== expected) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Bad warden key.' }))
        return
      }
      let raw = ''
      for await (const chunk of req) raw += chunk
      try {
        const data = JSON.parse(raw || '{}')
        const host = String(data.host || '').replace(/\/$/, '')
        if (!/^https:\/\/[a-z0-9.-]+\.trycloudflare\.com$/i.test(host) && !/^https?:\/\/\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(host)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Bad LPC host.' }))
          return
        }
        setRegisteredLpcHost(host)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, host }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
      return
    }

    if (req.method === 'POST' && (req.url === '/lpc/pull' || req.url === '/lpc/result')) {
      const key = String(req.headers['x-lpc-key'] || '')
      const expected = (process.env.LPC_BOT_KEY || '').trim()
      if (!expected || key !== expected) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Bad warden key.' }))
        return
      }
      let raw = ''
      for await (const chunk of req) raw += chunk
      if (req.url === '/lpc/pull') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jobs: takeLpcJobs() }))
        return
      }
      try {
        const data = JSON.parse(raw || '{}')
        finishLpcJob(String(data.id || ''), data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(404)
      res.end()
      return
    }

    const auth = req.headers['x-platform-secret']
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT
    if (isProduction && !secret) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'PLATFORM_API_SECRET is required in production' }))
      return
    }
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

      if (req.url === '/webhook/account/upsert') {
        const { googleId, email, name, image } = data
        if (!googleId || !email) throw new Error('googleId and email required')
        const account = upsertAppAccount({ googleId, email, name, image })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, account }))
        return
      }

      if (req.url === '/webhook/account/get') {
        const account = data.googleId
          ? getAppAccountByGoogleId(data.googleId)
          : data.email
            ? getAppAccountByEmail(data.email)
            : null
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, account }))
        return
      }

      if (req.url === '/webhook/account/subscribe') {
        const { email } = data
        if (!email) throw new Error('email required')
        const account = subscribeEmailAccount(email)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, account }))
        return
      }

      if (req.url === '/webhook/account/link') {
        const account = linkAppAccount(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, account }))
        return
      }

      if (req.url === '/webhook/account/preferences') {
        const account = updateAppAccountPreferences(
          { googleId: data.googleId, email: data.email },
          data.emailAlerts,
        )
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, account }))
        return
      }

      if (req.url === '/webhook/account/profile') {
        const profile = getAppAccountProfile({
          googleId: data.googleId,
          email: data.email,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, profile }))
        return
      }

      if (req.url === '/webhook/wallet/link-code') {
        const { wallet } = data
        if (!wallet) throw new Error('wallet required')
        const result = createWalletLinkCode(wallet)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/wallet/link-status') {
        const { wallet } = data
        if (!wallet) throw new Error('wallet required')
        const status = getWalletLinkStatus(wallet)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, status }))
        return
      }

      if (req.url === '/webhook/eyes-account/signup') {
        const { email, passwordHash, walletAddress, walletEncSalt, walletEncIv, walletEncCiphertext, solanaAddress } =
          data
        if (!email || !passwordHash || !walletAddress) {
          throw new Error('email, passwordHash, and walletAddress required')
        }
        const account = createEyesAccount({
          email,
          passwordHash,
          walletAddress,
          walletEncSalt,
          walletEncIv,
          walletEncCiphertext,
          solanaAddress,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            account: {
              id: account.id,
              email: account.email,
              walletAddress: account.walletAddress,
              solanaAddress: account.solanaAddress ?? null,
              hasWallet: Boolean(account.walletEnc),
              createdAt: account.createdAt,
            },
          }),
        )
        return
      }

      if (req.url === '/webhook/eyes-account/auth') {
        const { email } = data
        if (!email) throw new Error('email required')
        const auth = getEyesAccountAuthByEmail(email)
        if (!auth?.passwordHash) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Account not found' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, auth }))
        return
      }

      if (req.url === '/webhook/eyes-account/me') {
        const { accountId } = data
        if (!accountId) throw new Error('accountId required')
        const row = getAppAccountById(accountId)
        if (!row) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Account not found' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            account: {
              id: row.id,
              email: row.email,
              walletAddress: row.walletAddress,
              solanaAddress: row.solanaAddress ?? null,
              hasWallet: Boolean(row.walletAddress),
              createdAt: row.createdAt,
            },
          }),
        )
        return
      }

      if (req.url === '/webhook/eyes-account/solana-address') {
        const { email, solanaAddress, onlyIfMissing } = data
        if (!email || !solanaAddress) {
          throw new Error('email and solanaAddress required')
        }
        const account = updateEyesAccountSolanaAddress(email, solanaAddress, {
          onlyIfMissing: onlyIfMissing !== false,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            account: {
              id: account.id,
              email: account.email,
              walletAddress: account.walletAddress,
              solanaAddress: account.solanaAddress ?? null,
              hasWallet: Boolean(account.walletEnc),
              createdAt: account.createdAt,
            },
          }),
        )
        return
      }

      if (req.url === '/webhook/eyes-account/change-password') {
        const { email, passwordHash, walletEncSalt, walletEncIv, walletEncCiphertext } = data
        if (!email || !passwordHash || !walletEncSalt || !walletEncIv || !walletEncCiphertext) {
          throw new Error('email and password fields required')
        }
        changeEyesAccountPassword({
          email,
          passwordHash,
          walletEncSalt,
          walletEncIv,
          walletEncCiphertext,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }

      if (req.url === '/webhook/account/settings/get') {
        const { email } = data
        if (!email) throw new Error('email required')
        const settings = getAccountSettings(email)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, settings }))
        return
      }

      if (req.url === '/webhook/account/settings/update') {
        const { email, settings } = data
        if (!email || !settings) throw new Error('email and settings required')
        const updated = updateAccountSettings(email, settings)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, settings: updated }))
        return
      }

      if (req.url === '/webhook/api-keys/create') {
        const { accountId, email, name, keyHash, keyPrefix, scopes, tier, kind, teamId } = data
        if (!accountId || !email || !name || !keyHash || !keyPrefix) {
          throw new Error('accountId, email, name, keyHash, and keyPrefix required')
        }
        const record = createApiKey({
          accountId,
          email,
          name,
          keyHash,
          keyPrefix,
          scopes,
          tier,
          kind,
          teamId,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/api-keys/list') {
        const { accountId } = data
        if (!accountId) throw new Error('accountId required')
        const records = listApiKeys(accountId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, records }))
        return
      }

      if (req.url === '/webhook/api-keys/revoke') {
        const { accountId, keyId } = data
        if (!accountId || !keyId) throw new Error('accountId and keyId required')
        const record = revokeApiKey({ accountId, keyId })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/api-keys/auth') {
        const { keyHash } = data
        if (!keyHash) throw new Error('keyHash required')
        const record = getApiKeyAuth(keyHash)
        if (!record) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid API key' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/api-keys/usage') {
        const { accountId } = data
        if (!accountId) throw new Error('accountId required')
        const usage = listApiKeyUsage(accountId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, usage }))
        return
      }

      if (req.url === '/webhook/eyes-account/forgot-password') {
        const { email } = data
        if (!email) throw new Error('email required')
        const result = createPasswordResetToken(email)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/eyes-account/reset-password') {
        const { token, passwordHash } = data
        if (!token || !passwordHash) throw new Error('token and passwordHash required')
        const email = consumePasswordResetToken(token, passwordHash)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, email }))
        return
      }

      if (req.url === '/webhook/eyes-account/export') {
        const { email } = data
        if (!email) throw new Error('email required')
        const payload = exportAccountData(email)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, export: payload }))
        return
      }

      if (req.url === '/webhook/eyes-account/delete') {
        const { email } = data
        if (!email) throw new Error('email required')
        const result = deleteAccount(email)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      if (req.url === '/webhook/oauth/apps/create') {
        const { accountId, name, clientId, clientSecretHash, clientPrefix, redirectUris, scopes } = data
        if (!accountId || !name || !clientId || !clientSecretHash) {
          throw new Error('accountId, name, clientId, clientSecretHash required')
        }
        const app = createOAuthApp({
          accountId,
          name,
          clientId,
          clientSecretHash,
          clientPrefix,
          redirectUris: redirectUris ?? [],
          scopes: scopes ?? ['launches:read'],
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, app }))
        return
      }

      if (req.url === '/webhook/oauth/apps/list') {
        const { accountId } = data
        if (!accountId) throw new Error('accountId required')
        const apps = listOAuthApps(accountId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, apps }))
        return
      }

      if (req.url === '/webhook/oauth/authorize') {
        const { appId, accountId, redirectUri, scopes } = data
        if (!appId || !accountId || !redirectUri) throw new Error('appId, accountId, redirectUri required')
        const code = createOAuthCode({
          appId,
          accountId,
          redirectUri,
          scopes: scopes ?? ['launches:read'],
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, code }))
        return
      }

      if (req.url === '/webhook/oauth/token') {
        const { code, clientId, clientSecretHash, redirectUri } = data
        if (!code || !clientId || !clientSecretHash || !redirectUri) {
          throw new Error('code, clientId, clientSecretHash, redirectUri required')
        }
        const token = exchangeOAuthCode({
          rawCode: code,
          clientId,
          clientSecretHash,
          redirectUri,
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...token }))
        return
      }

      if (req.url === '/webhook/launch/register') {
        const record = registerLaunchMetadata(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/launch/list') {
        const records = listLaunchMetadata()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, records }))
        return
      }

      if (req.url === '/webhook/boost/notify') {
        const {
          launchId,
          launchName,
          launchSymbol,
          numericLaunchId,
          tokenAddress,
          fomoUrl,
          packageId,
          packageLabel,
          durationHours,
          rankMultiplier,
          eyesSpent,
          burnAmount,
          expiresAt,
          wallet,
          txHash,
        } = data

        if (!launchId || !packageId || !txHash) {
          throw new Error('launchId, packageId, and txHash are required')
        }

        if (hasBoostNotification(txHash)) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, duplicate: true }))
          return
        }

        const result = await postBoostToLaunches(resolveClient(), {
          launchId,
          launchName,
          launchSymbol,
          numericLaunchId,
          tokenAddress,
          fomoUrl,
          packageId,
          packageLabel,
          durationHours,
          rankMultiplier,
          eyesSpent,
          burnAmount,
          expiresAt,
          wallet,
          txHash,
        })

        if (!result.ok) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: result.error ?? 'Discord post failed' }))
          return
        }

        recordBoostNotification({ txHash, packageId, launchId })
        await staffLog(
          resolveClient(),
          `📣 Boost **${packageLabel ?? packageId}** · ${launchSymbol ? `$${launchSymbol}` : launchName} · \`${String(txHash).slice(0, 10)}…\``,
        )
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, channelId: result.channelId }))
        return
      }

      if (req.url === '/webhook/retention/ledger') {
        const ledger = getRetentionLedger()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ledger }))
        return
      }

      if (req.url === '/webhook/retention/boost') {
        const record = recordBoostRecord(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/retention/launch-fee') {
        const record = recordLaunchFeeRecord(data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, record }))
        return
      }

      if (req.url === '/webhook/retention/alerts') {
        const result = upsertRetentionAlerts(Array.isArray(data.alerts) ? data.alerts : [])
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, ...result }))
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Unknown webhook route: ${req.url ?? ''}` }))
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

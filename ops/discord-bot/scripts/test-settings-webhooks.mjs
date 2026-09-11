/**
 * Smoke test settings webhooks on local or production bot.
 *   BOT_WEBHOOK_URL=http://localhost:3847 PLATFORM_API_SECRET=... node scripts/test-settings-webhooks.mjs
 */
import { randomUUID } from 'crypto'
import {
  db,
  createApiKey,
  listApiKeys,
  updateAccountSettings,
  getAccountSettings,
  changeEyesAccountPassword,
} from '../src/db.js'

const base = (process.env.BOT_WEBHOOK_URL ?? 'http://localhost:3847').replace(/\/$/, '')
const secret = process.env.PLATFORM_API_SECRET ?? ''

async function post(path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (secret) headers['x-platform-secret'] = secret
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let json = {}
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

const email = `settings-smoke-${Date.now()}@example.com`
const accountId = randomUUID()
const now = new Date().toISOString()

db.prepare(
  `INSERT INTO app_accounts (id, email, password_hash, wallet_address, wallet_enc_salt, wallet_enc_iv, wallet_enc_ciphertext, wallet_enc_version, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
).run(accountId, email, 'scrypt:aa:bb', '0xabc', 's', 'i', 'c', now, now)

console.log('Testing bot at', base)
console.log('Test account', email, accountId)

const dbSettings = updateAccountSettings(email, {
  launchWebhookUrl: 'https://example.com/hook',
  launchWebhookSecret: 'secret',
  defaultLaunchChain: 'base',
  publicCreatorProfile: true,
})
console.log('DB update ok', dbSettings.launchWebhookUrl)

const getRes = await post('/webhook/account/settings/get', { email })
console.log('GET webhook', getRes.status, getRes.json.settings?.launchWebhookUrl ?? getRes.json.error)

const patchRes = await post('/webhook/account/settings/update', {
  email,
  settings: {
    ...dbSettings,
    launchWebhookUrl: 'https://example.com/updated',
  },
})
console.log('PATCH webhook', patchRes.status, patchRes.json.settings?.launchWebhookUrl ?? patchRes.json.error)

const createRes = await post('/webhook/api-keys/create', {
  accountId,
  email,
  name: 'Smoke key',
  keyHash: `hash-${Date.now()}`,
  keyPrefix: 'eok_live_smoke',
  scopes: ['launches:read'],
})
console.log('CREATE key', createRes.status, createRes.json.record?.id ?? createRes.json.error)

const listRes = await post('/webhook/api-keys/list', { accountId })
console.log('LIST keys', listRes.status, listRes.json.records?.length ?? listRes.json.error)

const passRes = await post('/webhook/eyes-account/change-password', {
  email,
  passwordHash: 'scrypt:cc:dd',
  walletEncSalt: 's2',
  walletEncIv: 'i2',
  walletEncCiphertext: 'c2',
})
console.log('CHANGE password', passRes.status, passRes.json.ok ?? passRes.json.error)

const directKeys = listApiKeys(accountId)
console.log('Direct DB list', directKeys.length, 'keys')
console.log('Direct DB settings', getAccountSettings(email).launchWebhookUrl)

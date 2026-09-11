/**
 * End-to-end settings smoke test against local Next.js + Railway bot.
 * Usage: node scripts/settings-smoke-test.mjs [baseUrl]
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const BASE = process.argv[2]?.replace(/\/$/, '') || 'http://localhost:3000'
const PASSWORD = 'QaTestPass123!'
const EMAIL = `cursor-qa-${Date.now()}@test.invalid`

const PBKDF2_ITERATIONS = 310_000

function b64Encode(bytes) {
  return Buffer.from(bytes).toString('base64')
}

async function encryptPrivateKey(privateKeyHex, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(privateKeyHex))
  return { saltB64: b64Encode(salt), ivB64: b64Encode(iv), ciphertextB64: b64Encode(new Uint8Array(ciphertext)) }
}

let cookie = ''

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const c of setCookie) {
    const part = c.split(';')[0]
    if (part.startsWith('eyes_account_session=')) cookie = part
  }
  if (!setCookie.length) {
    const raw = res.headers.get('set-cookie')
    if (raw?.includes('eyes_account_session=')) {
      cookie = raw.split(';')[0]
    }
  }
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

function assert(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
  return ok
}

async function main() {
  console.log(`\nSettings smoke test → ${BASE}\n`)

  const pk = generatePrivateKey()
  const account = privateKeyToAccount(pk)
  const enc = await encryptPrivateKey(pk.replace(/^0x/, ''), PASSWORD)
  const wallet = {
    v: 1,
    address: account.address,
    ...enc,
    createdAt: new Date().toISOString(),
  }

  let r = await api('POST', '/api/eyes-account/signup', { email: EMAIL, password: PASSWORD, wallet })
  assert('signup', r.status === 200 && r.json.ok, JSON.stringify(r.json).slice(0, 120))

  r = await api('GET', '/api/settings')
  assert('GET settings', r.status === 200 && r.json.settings, r.json.error)
  const accountId = r.json.accountId

  r = await api('PATCH', '/api/settings', {
    defaultLaunchChain: 'ethereum',
    publicCreatorProfile: false,
    walletAutoLockMinutes: 30,
    discordDmLaunches: true,
    webhookOnlyMine: true,
    webhookFilterChains: ['base', 'ethereum'],
  })
  assert('PATCH settings', r.status === 200 && r.json.settings?.defaultLaunchChain === 'ethereum', r.json.error)

  r = await api('POST', '/api/settings/api-keys', {
    name: 'QA personal key',
    scopes: ['launches:read', 'account:read'],
  })
  assert('create API key', r.status === 200 && r.json.rawKey, r.json.error)
  const keyId = r.json.key?.id
  const rawKey = r.json.rawKey

  r = await api('GET', '/api/settings/api-keys')
  assert('list API keys', r.status === 200 && r.json.keys?.length >= 1, r.json.error)

  r = await api('GET', '/api/settings/api-keys/usage')
  assert('API usage', r.status === 200 && Array.isArray(r.json.usage), r.json.error)

  r = await api('POST', '/api/settings/api-keys', {
    name: 'QA team key',
    scopes: ['launches:read'],
    kind: 'team',
  })
  assert('create team key', r.status === 200 && r.json.rawKey?.startsWith('eok_team_'), r.json.error)

  r = await api('POST', '/api/oauth/apps', {
    name: 'QA OAuth App',
    redirectUris: ['https://example.com/callback'],
    scopes: ['launches:read'],
  })
  assert(
    'create OAuth app',
    r.status === 200 && r.json.clientSecret,
    `${r.json.error ?? ''} (HTTP ${r.status})`,
  )

  r = await api('GET', '/api/oauth/apps')
  assert('list OAuth apps', r.status === 200 && r.json.apps?.length >= 1, r.json.error)

  r = await api('POST', '/api/account/preferences', {
    launches: false,
    presale: true,
    season: false,
  })
  assert('save email prefs', r.status === 200, r.json.error)

  r = await api('PATCH', '/api/settings', {
    launchWebhookUrl: 'https://webhook.site/test-eyes-qa',
    launchWebhookSecret: 'qa-secret',
  })
  assert('save webhook', r.status === 200, r.json.error)

  r = await api('POST', '/api/settings/webhook-test', {})
  assert('webhook test', r.status === 200 || r.status === 400, r.json.error || `HTTP ${r.status}`)

  r = await api('GET', '/api/eyes-account/export')
  assert('account export', r.status === 200 && r.json.export, r.json.error)

  r = await fetch(`${BASE}/api/v1/launches?limit=1`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  })
  const v1 = await r.json()
  assert('v1 API with key', r.status === 200 && v1.ok !== false, JSON.stringify(v1).slice(0, 80))

  r = await fetch(`${BASE}/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rawKey}`,
    },
    body: JSON.stringify({ query: '{ launches(limit: 1) { total } }' }),
  })
  const gql = await r.json()
  assert('GraphQL with key', r.status === 200 && gql.data?.launches, JSON.stringify(gql).slice(0, 80))

  if (keyId) {
    r = await api('DELETE', `/api/settings/api-keys/${keyId}`)
    assert('revoke API key', r.status === 200, r.json.error)
  }

  r = await api('POST', '/api/eyes-account/delete', {
    confirmEmail: EMAIL,
    password: PASSWORD,
  })
  assert('delete test account', r.status === 200, r.json.error)

  console.log('\nDone.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

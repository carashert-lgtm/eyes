import { createHash, randomBytes, randomUUID } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

import { botServiceError, callBot } from '@/lib/bot-webhook'

import type { ApiKeyScope, OAuthAppRecord } from '@/lib/settings/types'

const CLIENT_PREFIX = 'eok_app_'
const LOCAL_PATH = path.join(process.cwd(), 'data', 'oauth-apps.json')

function canUseLocalStore(): boolean {
  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

type StoredOAuthApp = OAuthAppRecord & { clientSecretHash: string }
type LocalStore = { records: StoredOAuthApp[]; updatedAt: string }

function readLocal(): LocalStore {
  if (!existsSync(LOCAL_PATH)) return { records: [], updatedAt: new Date(0).toISOString() }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, 'utf-8')) as LocalStore
  } catch {
    return { records: [], updatedAt: new Date(0).toISOString() }
  }
}

function writeLocal(store: LocalStore) {
  mkdirSync(path.dirname(LOCAL_PATH), { recursive: true })
  store.updatedAt = new Date().toISOString()
  writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

export function generateOAuthClientCredentials(): {
  clientId: string
  clientSecret: string
  clientSecretHash: string
  clientPrefix: string
} {
  const clientId = `${CLIENT_PREFIX}${randomBytes(16).toString('base64url')}`
  const clientSecret = randomBytes(32).toString('base64url')
  return {
    clientId,
    clientSecret,
    clientSecretHash: createHash('sha256').update(clientSecret).digest('hex'),
    clientPrefix: clientId.slice(0, 12),
  }
}

export async function createOAuthApp(input: {
  accountId: string
  name: string
  redirectUris: string[]
  scopes: ApiKeyScope[]
}): Promise<{ app: OAuthAppRecord; clientSecret: string }> {
  const { clientId, clientSecret, clientSecretHash, clientPrefix } = generateOAuthClientCredentials()

  const bot = await callBot<{ ok: true; app: OAuthAppRecord }>('/webhook/oauth/apps/create', {
    accountId: input.accountId,
    name: input.name.trim(),
    clientId,
    clientSecretHash,
    clientPrefix,
    redirectUris: input.redirectUris,
    scopes: input.scopes,
  })

  if (bot.ok) {
    return { app: (bot.data as { app: OAuthAppRecord }).app, clientSecret }
  }

  if (!canUseLocalStore()) {
    throw botServiceError(bot, 'Could not create OAuth app')
  }

  const record: StoredOAuthApp = {
    id: randomUUID(),
    accountId: input.accountId,
    name: input.name.trim(),
    clientId,
    clientPrefix,
    redirectUris: input.redirectUris,
    scopes: input.scopes,
    createdAt: new Date().toISOString(),
    revokedAt: null,
    clientSecretHash,
  }
  const store = readLocal()
  store.records.push(record)
  writeLocal(store)
  const { clientSecretHash: _omit, ...app } = record
  return { app, clientSecret }
}

export async function listOAuthApps(accountId: string): Promise<OAuthAppRecord[]> {
  const bot = await callBot<{ ok: true; apps: OAuthAppRecord[] }>('/webhook/oauth/apps/list', {
    accountId,
  })

  if (bot.ok) return (bot.data as { apps: OAuthAppRecord[] }).apps

  if (!canUseLocalStore()) return []

  return readLocal()
    .records.filter((r) => r.accountId === accountId && !r.revokedAt)
    .map(({ clientSecretHash: _omit, ...app }) => app)
}

export async function authorizeOAuthApp(input: {
  appId: string
  accountId: string
  redirectUri: string
  scopes: ApiKeyScope[]
}): Promise<string> {
  const bot = await callBot<{ ok: true; code: string }>('/webhook/oauth/authorize', input)
  if (bot.ok) return (bot.data as { code: string }).code
  throw botServiceError(bot, 'Authorization failed')
}

export async function exchangeOAuthToken(input: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}) {
  const clientSecretHash = createHash('sha256').update(input.clientSecret).digest('hex')
  const bot = await callBot<{ ok: true; accessToken: string; tokenType: string; scopes: string[] }>(
    '/webhook/oauth/token',
    {
      code: input.code,
      clientId: input.clientId,
      clientSecretHash,
      redirectUri: input.redirectUri,
    },
  )
  if (bot.ok) return bot.data
  throw botServiceError(bot, 'Token exchange failed')
}

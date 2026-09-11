import { createHash, randomBytes, randomUUID } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { botServiceError, callBot } from '@/lib/bot-webhook'
import type { ApiKeyKind, ApiKeyRecord, ApiKeyScope, ApiKeyTier, ApiKeyUsageSummary } from '@/lib/settings/types'

const LOCAL_PATH = path.join(process.cwd(), 'data', 'api-keys.json')
const KEY_PREFIX = 'eok_live_'
const TEAM_PREFIX = 'eok_team_'

function canUseLocalStore(): boolean {
  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

type StoredApiKey = ApiKeyRecord & { keyHash: string }
type LocalStore = { records: StoredApiKey[]; updatedAt: string }

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

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export function generateApiKeyMaterial(kind: ApiKeyKind = 'personal'): {
  rawKey: string
  keyHash: string
  keyPrefix: string
} {
  const prefix = kind === 'team' ? TEAM_PREFIX : KEY_PREFIX
  const rawKey = `${prefix}${randomBytes(32).toString('base64url')}`
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 20),
  }
}

const VALID_SCOPES = new Set<ApiKeyScope>(['launches:read', 'launches:write', 'account:read'])

export function normalizeScopes(scopes: string[]): ApiKeyScope[] {
  const out = scopes.filter((s): s is ApiKeyScope => VALID_SCOPES.has(s as ApiKeyScope))
  return out.length ? out : ['launches:read']
}

function defaultRecordFields(kind: ApiKeyKind): Pick<ApiKeyRecord, 'tier' | 'kind' | 'teamId'> {
  return {
    tier: kind === 'team' ? 'team' : 'free',
    kind,
    teamId: kind === 'team' ? randomUUID() : null,
  }
}

export async function createApiKey(input: {
  accountId: string
  email: string
  name: string
  scopes: ApiKeyScope[]
  kind?: ApiKeyKind
  tier?: ApiKeyTier
  teamId?: string | null
}): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const kind = input.kind ?? 'personal'
  const { rawKey, keyHash, keyPrefix } = generateApiKeyMaterial(kind)
  const scopes = normalizeScopes(input.scopes)
  const extras = defaultRecordFields(kind)

  const bot = await callBot<{ ok: true; record: ApiKeyRecord }>('/webhook/api-keys/create', {
    accountId: input.accountId,
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    keyHash,
    keyPrefix,
    scopes,
    tier: input.tier ?? extras.tier,
    kind,
    teamId: input.teamId ?? extras.teamId,
  })

  if (bot.ok) {
    return { record: (bot.data as { record: ApiKeyRecord }).record, rawKey }
  }

  if (!canUseLocalStore()) {
    throw botServiceError(bot, 'Could not create API key')
  }

  const record: StoredApiKey = {
    id: randomUUID(),
    accountId: input.accountId,
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    keyPrefix,
    keyHash,
    scopes,
    tier: input.tier ?? extras.tier,
    kind,
    teamId: input.teamId ?? extras.teamId,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  }
  const store = readLocal()
  store.records.push(record)
  writeLocal(store)
  const { keyHash: _omit, ...publicRecord } = record
  return { record: publicRecord, rawKey }
}

export async function listApiKeys(accountId: string): Promise<ApiKeyRecord[]> {
  const bot = await callBot<{ ok: true; records: ApiKeyRecord[] }>(
    '/webhook/api-keys/list',
    { accountId },
  )
  if (bot.ok) return (bot.data as { records: ApiKeyRecord[] }).records

  if (!canUseLocalStore()) {
    console.warn('[api-keys] list failed:', bot.error, bot.status)
    return []
  }

  return readLocal()
    .records.filter((r) => r.accountId === accountId && !r.revokedAt)
    .map(({ keyHash: _omit, ...r }) => r)
}

export async function listApiKeyUsage(accountId: string): Promise<ApiKeyUsageSummary[]> {
  const bot = await callBot<{ ok: true; usage: ApiKeyUsageSummary[] }>(
    '/webhook/api-keys/usage',
    { accountId },
  )
  if (bot.ok) return (bot.data as { usage: ApiKeyUsageSummary[] }).usage
  if (!canUseLocalStore()) return []
  return []
}

export async function revokeApiKey(accountId: string, keyId: string): Promise<ApiKeyRecord> {
  const bot = await callBot<{ ok: true; record: ApiKeyRecord }>('/webhook/api-keys/revoke', {
    accountId,
    keyId,
  })
  if (bot.ok) return (bot.data as { record: ApiKeyRecord }).record

  if (!canUseLocalStore()) {
    throw botServiceError(bot, 'Could not revoke API key')
  }

  const store = readLocal()
  const idx = store.records.findIndex((r) => r.id === keyId && r.accountId === accountId)
  if (idx < 0) throw new Error('API key not found')
  store.records[idx].revokedAt = new Date().toISOString()
  writeLocal(store)
  const { keyHash: _omit, ...publicRecord } = store.records[idx]
  return publicRecord
}

const KEY_PREFIXES = [KEY_PREFIX, TEAM_PREFIX, 'eok_oauth_']

export async function authenticateApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  if (!KEY_PREFIXES.some((p) => rawKey.startsWith(p))) return null
  const keyHash = hashApiKey(rawKey)

  const bot = await callBot<{ ok: true; record: ApiKeyRecord }>('/webhook/api-keys/auth', {
    keyHash,
  })
  if (bot.ok) return (bot.data as { record: ApiKeyRecord }).record

  if (!canUseLocalStore()) return null

  const store = readLocal()
  const row = store.records.find((r) => r.keyHash === keyHash && !r.revokedAt)
  if (!row) return null
  row.lastUsedAt = new Date().toISOString()
  writeLocal(store)
  const { keyHash: _omit, ...publicRecord } = row
  return publicRecord
}

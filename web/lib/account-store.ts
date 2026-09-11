import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { callBot } from '@/lib/bot-webhook'
import {
  DEFAULT_EMAIL_ALERTS,
  type AppAccount,
  type AccountLinkSummary,
  type AccountProfile,
  type EmailAlertPrefs,
} from '@/lib/account-types'

const LOCAL_ACCOUNTS = path.join(process.cwd(), 'data', 'app-accounts.json')

/** Local JSON is dev-only; Vercel/serverless filesystem is read-only. */
function canUseLocalStore(): boolean {
  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

function botUnavailableError(
  bot: { ok: false; error: string; status: number },
  fallback = 'Account service is temporarily unavailable. Try again shortly.',
): Error {
  return new Error(bot.error || fallback)
}

type LocalStore = {
  accounts: AppAccount[]
  updatedAt: string
}

function readLocal(): LocalStore {
  if (!existsSync(LOCAL_ACCOUNTS)) {
    return { accounts: [], updatedAt: new Date(0).toISOString() }
  }
  try {
    return JSON.parse(readFileSync(LOCAL_ACCOUNTS, 'utf-8')) as LocalStore
  } catch {
    return { accounts: [], updatedAt: new Date(0).toISOString() }
  }
}

function writeLocal(store: LocalStore) {
  mkdirSync(path.dirname(LOCAL_ACCOUNTS), { recursive: true })
  store.updatedAt = new Date().toISOString()
  writeFileSync(LOCAL_ACCOUNTS, JSON.stringify(store, null, 2), 'utf-8')
}

function findLocalByGoogle(googleId: string): AppAccount | null {
  return readLocal().accounts.find((a) => a.googleId === googleId) ?? null
}

function findLocalByEmail(email: string): AppAccount | null {
  return readLocal().accounts.find((a) => a.email === email.toLowerCase()) ?? null
}

function buildLocalLinkSummary(account: AppAccount): AccountLinkSummary {
  return {
    walletLinked: Boolean(account.walletAddress),
    discordLinked: Boolean(account.discordId),
    presaleContributions: 0,
    teamPoolUser: Boolean(account.discordId),
    seasonPoints: null,
  }
}

export async function subscribeEmailAccount(email: string): Promise<AppAccount> {
  const bot = await callBot<{ ok: true; account: AppAccount }>('/webhook/account/subscribe', {
    email,
  })
  if (bot.ok) return bot.data.account
  if (!canUseLocalStore()) throw botUnavailableError(bot)

  const existing = findLocalByEmail(email)
  if (existing) return existing

  const now = new Date().toISOString()
  const account: AppAccount = {
    id: randomUUID(),
    googleId: null,
    email: email.toLowerCase(),
    name: null,
    image: null,
    walletAddress: null,
    discordId: null,
    emailAlerts: { ...DEFAULT_EMAIL_ALERTS },
    createdAt: now,
    updatedAt: now,
  }
  const store = readLocal()
  store.accounts.push(account)
  writeLocal(store)
  return account
}

export async function upsertAppAccount(input: {
  googleId: string
  email: string
  name: string | null
  image: string | null
}): Promise<AppAccount> {
  const bot = await callBot<{ ok: true; account: AppAccount }>('/webhook/account/upsert', input)
  if (bot.ok) return bot.data.account
  if (!canUseLocalStore()) throw botUnavailableError(bot)

  const store = readLocal()
  const byGoogle = store.accounts.find((a) => a.googleId === input.googleId)
  const byEmail = store.accounts.find((a) => a.email === input.email.toLowerCase())
  const now = new Date().toISOString()

  if (byGoogle) {
    byGoogle.email = input.email.toLowerCase()
    byGoogle.name = input.name
    byGoogle.image = input.image
    byGoogle.updatedAt = now
    writeLocal(store)
    return byGoogle
  }

  if (byEmail) {
    byEmail.googleId = input.googleId
    byEmail.name = input.name
    byEmail.image = input.image
    byEmail.updatedAt = now
    writeLocal(store)
    return byEmail
  }

  const account: AppAccount = {
    id: randomUUID(),
    googleId: input.googleId,
    email: input.email.toLowerCase(),
    name: input.name,
    image: input.image,
    walletAddress: null,
    discordId: null,
    emailAlerts: { ...DEFAULT_EMAIL_ALERTS },
    createdAt: now,
    updatedAt: now,
  }
  store.accounts.push(account)
  writeLocal(store)
  return account
}

export async function getAppAccount(googleId: string): Promise<AppAccount | null> {
  const bot = await callBot<{ ok: true; account: AppAccount | null }>('/webhook/account/get', {
    googleId,
  })
  if (bot.ok) return bot.data.account
  return findLocalByGoogle(googleId)
}

export async function getAppAccountByEmail(email: string): Promise<AppAccount | null> {
  const bot = await callBot<{ ok: true; account: AppAccount | null }>('/webhook/account/get', {
    email,
  })
  if (bot.ok) return bot.data.account
  return findLocalByEmail(email)
}

export async function linkAppAccount(input: {
  googleId?: string
  email?: string
  wallet?: string | null
  discordId?: string | null
}): Promise<AppAccount> {
  const bot = await callBot<{ ok: true; account: AppAccount }>('/webhook/account/link', input)
  if (bot.ok) return bot.data.account
  if (!canUseLocalStore()) throw botUnavailableError(bot)

  const store = readLocal()
  const emailKey = input.email?.toLowerCase()
  const account = input.googleId
    ? store.accounts.find((a) => a.googleId === input.googleId)
    : emailKey
      ? store.accounts.find((a) => a.email === emailKey)
      : undefined
  if (!account) throw new Error('Account not found')

  if (input.wallet) account.walletAddress = input.wallet.toLowerCase()
  if (input.discordId) account.discordId = input.discordId
  account.updatedAt = new Date().toISOString()
  writeLocal(store)
  return account
}

export async function updateEmailPreferences(
  identity: { googleId?: string; email?: string },
  prefs: EmailAlertPrefs,
): Promise<AppAccount> {
  const bot = await callBot<{ ok: true; account: AppAccount }>('/webhook/account/preferences', {
    ...identity,
    emailAlerts: prefs,
  })
  if (bot.ok) return bot.data.account
  if (!canUseLocalStore()) throw botUnavailableError(bot)

  const store = readLocal()
  const emailKey = identity.email?.toLowerCase()
  const account = identity.googleId
    ? store.accounts.find((a) => a.googleId === identity.googleId)
    : emailKey
      ? store.accounts.find((a) => a.email === emailKey)
      : undefined
  if (!account) throw new Error('Account not found')
  account.emailAlerts = prefs
  account.updatedAt = new Date().toISOString()
  writeLocal(store)
  return account
}

export async function getAccountProfile(identity: {
  googleId?: string
  email?: string
}): Promise<AccountProfile | null> {
  const bot = await callBot<{ ok: true; profile: AccountProfile | null }>(
    '/webhook/account/profile',
    identity,
  )
  if (bot.ok) return bot.data.profile

  const account = identity.googleId
    ? findLocalByGoogle(identity.googleId)
    : identity.email
      ? findLocalByEmail(identity.email)
      : null
  if (!account) return null
  return { account, links: buildLocalLinkSummary(account) }
}

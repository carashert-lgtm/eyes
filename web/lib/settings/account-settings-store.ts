import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

import path from 'path'

import { botServiceError, callBot } from '@/lib/bot-webhook'
import { getEyesAccountAuth } from '@/lib/eyes-account/store'
import { listApiKeys } from '@/lib/api-keys/store'

import { isLaunchChainKey } from '@/lib/launch-chains/registry'

import {

  DEFAULT_ACCOUNT_SETTINGS,

  type AccountSettings,

  type WalletAutoLockMinutes,

  type WebhookEventFilter,

} from '@/lib/settings/types'



const LOCAL_PATH = path.join(process.cwd(), 'data', 'account-settings.json')



function canUseLocalStore(): boolean {

  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'

}



type LocalStore = { byEmail: Record<string, AccountSettings>; updatedAt: string }



function readLocal(): LocalStore {

  if (!existsSync(LOCAL_PATH)) {

    return { byEmail: {}, updatedAt: new Date(0).toISOString() }

  }

  try {

    return JSON.parse(readFileSync(LOCAL_PATH, 'utf-8')) as LocalStore

  } catch {

    return { byEmail: {}, updatedAt: new Date(0).toISOString() }

  }

}



function writeLocal(store: LocalStore) {

  mkdirSync(path.dirname(LOCAL_PATH), { recursive: true })

  store.updatedAt = new Date().toISOString()

  writeFileSync(LOCAL_PATH, JSON.stringify(store, null, 2), 'utf-8')

}



const LOCK_MINUTES = new Set<WalletAutoLockMinutes>([0, 5, 15, 30, 60, 240, 1440])

const WEBHOOK_EVENTS = new Set<WebhookEventFilter>([

  'launch.created',

  'launch.discovery_registered',

  'webhook.test',

])



function normalizeSettings(input: Partial<AccountSettings>): AccountSettings {

  const chain = input.defaultLaunchChain ?? DEFAULT_ACCOUNT_SETTINGS.defaultLaunchChain

  const lockRaw = input.walletAutoLockMinutes ?? DEFAULT_ACCOUNT_SETTINGS.walletAutoLockMinutes

  const webhookFilterChains = (input.webhookFilterChains ?? [])

    .filter((c): c is AccountSettings['webhookFilterChains'][number] => isLaunchChainKey(c))

  const webhookEvents = (input.webhookEvents ?? DEFAULT_ACCOUNT_SETTINGS.webhookEvents).filter(

    (e): e is WebhookEventFilter => WEBHOOK_EVENTS.has(e as WebhookEventFilter),

  )

  return {

    defaultLaunchChain: isLaunchChainKey(chain) ? chain : 'base',

    launchWebhookUrl: input.launchWebhookUrl?.trim() || null,

    launchWebhookSecret: input.launchWebhookSecret?.trim() || null,

    publicCreatorProfile: input.publicCreatorProfile ?? true,

    webhookFilterChains,

    webhookOnlyMine: input.webhookOnlyMine ?? false,

    webhookEvents: webhookEvents.length ? webhookEvents : DEFAULT_ACCOUNT_SETTINGS.webhookEvents,

    walletAutoLockMinutes: LOCK_MINUTES.has(lockRaw as WalletAutoLockMinutes)

      ? (lockRaw as WalletAutoLockMinutes)

      : 15,

    discordDmLaunches: input.discordDmLaunches ?? false,

    discordDmPresale: input.discordDmPresale ?? false,

    discordDmSeason: input.discordDmSeason ?? false,

  }

}



export async function getAccountSettings(email: string): Promise<AccountSettings> {

  const bot = await callBot<{ ok: true; settings: AccountSettings }>(

    '/webhook/account/settings/get',

    { email: email.toLowerCase() },

  )

  if (bot.ok) {

    return normalizeSettings((bot.data as { settings: AccountSettings }).settings)

  }



  if (!canUseLocalStore()) {

    console.warn('[account-settings] get failed:', bot.error, bot.status)

    return DEFAULT_ACCOUNT_SETTINGS

  }



  const store = readLocal()

  return normalizeSettings(store.byEmail[email.toLowerCase()] ?? DEFAULT_ACCOUNT_SETTINGS)

}



export async function updateAccountSettings(

  email: string,

  patch: Partial<AccountSettings>,

): Promise<AccountSettings> {

  const current = await getAccountSettings(email)

  const next = normalizeSettings({ ...current, ...patch })



  const bot = await callBot<{ ok: true; settings: AccountSettings }>(

    '/webhook/account/settings/update',

    { email: email.toLowerCase(), settings: next },

  )

  if (bot.ok) {

    return normalizeSettings((bot.data as { settings: AccountSettings }).settings)

  }



  if (!canUseLocalStore()) {

    throw botServiceError(bot, 'Could not save settings')

  }



  const store = readLocal()

  store.byEmail[email.toLowerCase()] = next

  writeLocal(store)

  return next

}



export async function changeEyesAccountPassword(input: {

  email: string

  passwordHash: string

  walletEncSalt: string

  walletEncIv: string

  walletEncCiphertext: string

}): Promise<void> {

  const bot = await callBot<{ ok: true }>('/webhook/eyes-account/change-password', {

    email: input.email.toLowerCase(),

    passwordHash: input.passwordHash,

    walletEncSalt: input.walletEncSalt,

    walletEncIv: input.walletEncIv,

    walletEncCiphertext: input.walletEncCiphertext,

  })

  if (bot.ok) return

  if (!canUseLocalStore()) {
    throw botServiceError(bot, 'Could not change password')
  }

  const authPath = path.join(process.cwd(), 'data', 'eyes-accounts-auth.json')
  if (!existsSync(authPath)) throw new Error('Account not found')

  const store = JSON.parse(readFileSync(authPath, 'utf-8')) as {
    accounts: Array<Record<string, string>>
  }
  const row = store.accounts.find((a) => a.email === input.email.toLowerCase())
  if (!row) throw new Error('Account not found')

  row.passwordHash = input.passwordHash
  row.walletEncSalt = input.walletEncSalt
  row.walletEncIv = input.walletEncIv
  row.walletEncCiphertext = input.walletEncCiphertext
  row.updatedAt = new Date().toISOString()
  writeFileSync(authPath, JSON.stringify(store, null, 2), 'utf-8')
}



export async function exportAccountData(email: string) {

  const bot = await callBot<{ ok: true; export: unknown }>('/webhook/eyes-account/export', {

    email: email.toLowerCase(),

  })

  if (bot.ok) return (bot.data as { export: unknown }).export

  if (!canUseLocalStore()) throw botServiceError(bot, 'Could not export account data')

  const normalized = email.toLowerCase()
  const auth = await getEyesAccountAuth(normalized)
  if (!auth) throw new Error('Account not found')

  const settings = await getAccountSettings(normalized)
  const keys = await listApiKeys(auth.id)

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: auth.id,
      email: auth.email,
      walletAddress: auth.walletAddress,
      solanaAddress: auth.solanaAddress ?? null,
    },
    settings,
    apiKeys: keys.map(({ keyPrefix, name, scopes, tier, kind, createdAt, lastUsedAt }) => ({
      keyPrefix,
      name,
      scopes,
      tier,
      kind,
      createdAt,
      lastUsedAt,
    })),
  }

}



export async function deleteAccount(email: string) {

  const normalized = email.toLowerCase()

  const bot = await callBot<{ ok: true }>('/webhook/eyes-account/delete', {

    email: normalized,

  })

  if (bot.ok) return

  if (!canUseLocalStore()) throw botServiceError(bot, 'Could not delete account')

  const auth = await getEyesAccountAuth(normalized)
  if (!auth) throw new Error('Account not found')

  const retryBot = await callBot<{ ok: true }>('/webhook/eyes-account/delete', { email: normalized })
  if (retryBot.ok) return

  const authPath = path.join(process.cwd(), 'data', 'eyes-accounts-auth.json')
  if (existsSync(authPath)) {
    const store = JSON.parse(readFileSync(authPath, 'utf-8')) as {
      accounts: Array<Record<string, string>>
    }
    const idx = store.accounts.findIndex((a) => a.email === normalized)
    if (idx >= 0) {
      store.accounts.splice(idx, 1)
      writeFileSync(authPath, JSON.stringify(store, null, 2), 'utf-8')
    }
  }

  const localSettings = readLocal()
  delete localSettings.byEmail[normalized]
  writeLocal(localSettings)

}



import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { callBot } from '@/lib/bot-webhook'
import type { EncryptedWalletBlob, EyesAccountPublic } from '@/lib/eyes-account/types'

const LOCAL_AUTH = path.join(process.cwd(), 'data', 'eyes-accounts-auth.json')

function canUseLocalStore(): boolean {
  return process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production'
}

type LocalAuthRow = {
  id: string
  email: string
  passwordHash: string
  walletAddress: string
  walletEncSalt: string
  walletEncIv: string
  walletEncCiphertext: string
  createdAt: string
  updatedAt: string
}

type LocalStore = { accounts: LocalAuthRow[]; updatedAt: string }

function readLocal(): LocalStore {
  if (!existsSync(LOCAL_AUTH)) return { accounts: [], updatedAt: new Date(0).toISOString() }
  try {
    return JSON.parse(readFileSync(LOCAL_AUTH, 'utf-8')) as LocalStore
  } catch {
    return { accounts: [], updatedAt: new Date(0).toISOString() }
  }
}

function writeLocal(store: LocalStore) {
  mkdirSync(path.dirname(LOCAL_AUTH), { recursive: true })
  store.updatedAt = new Date().toISOString()
  writeFileSync(LOCAL_AUTH, JSON.stringify(store, null, 2), 'utf-8')
}

function toPublic(row: {
  id: string
  email: string
  walletAddress: string | null
  createdAt: string
}): EyesAccountPublic {
  return {
    id: row.id,
    email: row.email,
    walletAddress: row.walletAddress as `0x${string}` | null,
    hasWallet: Boolean(row.walletAddress),
    createdAt: row.createdAt,
  }
}

export async function signupEyesAccount(input: {
  email: string
  passwordHash: string
  wallet: EncryptedWalletBlob
  solanaAddress?: string | null
}): Promise<EyesAccountPublic> {
  const bot = await callBot<{ ok: true; account: EyesAccountPublic }>(
    '/webhook/eyes-account/signup',
    {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      walletAddress: input.wallet.address,
      walletEncSalt: input.wallet.saltB64,
      walletEncIv: input.wallet.ivB64,
      walletEncCiphertext: input.wallet.ciphertextB64,
      solanaAddress: input.solanaAddress ?? null,
    },
  )
  if (bot.ok) return bot.data.account

  if (!canUseLocalStore()) throw new Error(bot.error || 'Account service unavailable')

  const store = readLocal()
  if (store.accounts.some((a) => a.email === input.email.toLowerCase() && a.passwordHash)) {
    throw new Error('Email already registered')
  }

  const now = new Date().toISOString()
  const row: LocalAuthRow = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    walletAddress: input.wallet.address.toLowerCase(),
    walletEncSalt: input.wallet.saltB64,
    walletEncIv: input.wallet.ivB64,
    walletEncCiphertext: input.wallet.ciphertextB64,
    createdAt: now,
    updatedAt: now,
  }
  store.accounts.push(row)
  writeLocal(store)
  return toPublic(row)
}

export type EyesAccountAuthRecord = {
  id: string
  email: string
  passwordHash: string
  walletAddress: string | null
  solanaAddress?: string | null
  walletEnc: EncryptedWalletBlob | null
}

export async function getEyesAccountAuth(email: string): Promise<EyesAccountAuthRecord | null> {
  const bot = await callBot<{ ok: true; auth: EyesAccountAuthRecord }>(
    '/webhook/eyes-account/auth',
    { email: email.toLowerCase() },
  )
  if (bot.ok) {
    const payload = bot.data as { auth?: EyesAccountAuthRecord }
    const auth = payload.auth ?? null
    if (auth && !auth.solanaAddress) auth.solanaAddress = null
    return auth
  }

  if (!canUseLocalStore()) return null

  const row = readLocal().accounts.find((a) => a.email === email.toLowerCase())
  if (!row?.passwordHash) return null
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    walletAddress: row.walletAddress,
    walletEnc: {
      v: 1,
      address: row.walletAddress as `0x${string}`,
      saltB64: row.walletEncSalt,
      ivB64: row.walletEncIv,
      ciphertextB64: row.walletEncCiphertext,
      createdAt: row.createdAt,
    },
  }
}

export async function backfillEyesAccountSolanaAddress(input: {
  email: string
  solanaAddress: string
  onlyIfMissing?: boolean
}): Promise<EyesAccountPublic | null> {
  const bot = await callBot<{ ok: true; account: EyesAccountPublic }>(
    '/webhook/eyes-account/solana-address',
    {
      email: input.email.toLowerCase(),
      solanaAddress: input.solanaAddress.trim(),
      onlyIfMissing: input.onlyIfMissing !== false,
    },
  )
  if (bot.ok) return bot.data.account
  return null
}

export async function getEyesAccountById(accountId: string): Promise<EyesAccountPublic | null> {
  const bot = await callBot<{ ok: true; account: EyesAccountPublic }>(
    '/webhook/eyes-account/me',
    { accountId },
  )
  if (bot.ok) return bot.data.account

  if (!canUseLocalStore()) return null
  const row = readLocal().accounts.find((a) => a.id === accountId)
  return row ? toPublic(row) : null
}

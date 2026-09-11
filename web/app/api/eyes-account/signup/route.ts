import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/eyes-account/password'
import { deriveSolanaAddressFromEncryptedWallet } from '@/lib/eyes-account/solana-from-wallet'
import {
  createEyesAccountCookieValue,
  eyesAccountCookieOptions,
} from '@/lib/eyes-account/session'
import { getEyesAccountAuth, signupEyesAccount } from '@/lib/eyes-account/store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'
import { isAddress } from 'viem'
import type { EncryptedWalletBlob } from '@/lib/eyes-account/types'
import { sendEyesEmail } from '@/lib/email/send'
import { welcomeWalletEmail } from '@/lib/email/templates'

const LIMIT = 20
const WINDOW_MS = 15 * 60 * 1000

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  return null
}

function parseWalletBlob(raw: unknown): EncryptedWalletBlob | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Record<string, unknown>
  if (
    w.v !== 1 ||
    typeof w.address !== 'string' ||
    !isAddress(w.address) ||
    typeof w.saltB64 !== 'string' ||
    typeof w.ivB64 !== 'string' ||
    typeof w.ciphertextB64 !== 'string'
  ) {
    return null
  }
  return {
    v: 1,
    address: w.address as `0x${string}`,
    saltB64: w.saltB64,
    ivB64: w.ivB64,
    ciphertextB64: w.ciphertextB64,
    createdAt: typeof w.createdAt === 'string' ? w.createdAt : new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('eyes-account-signup', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { email?: string; password?: string; wallet?: unknown; solanaAddress?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const wallet = parseWalletBlob(body.wallet)

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const passErr = validatePassword(password)
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })
  if (!wallet) {
    return NextResponse.json({ error: 'Valid encrypted wallet payload required' }, { status: 400 })
  }

  const existing = await getEyesAccountAuth(email)
  if (existing?.passwordHash) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  try {
    let solanaAddress: string
    try {
      solanaAddress = await deriveSolanaAddressFromEncryptedWallet(password, wallet)
    } catch {
      return NextResponse.json({ error: 'Could not derive Solana address from wallet' }, { status: 400 })
    }

    const clientSol =
      typeof body.solanaAddress === 'string' ? body.solanaAddress.trim() : null
    if (clientSol && clientSol !== solanaAddress) {
      return NextResponse.json({ error: 'Solana address mismatch — refresh and try again' }, { status: 400 })
    }

    const created = await signupEyesAccount({
      email,
      passwordHash: hashPassword(password),
      wallet,
      solanaAddress,
    })

    const welcome = welcomeWalletEmail({
      email: created.email,
      walletAddress: created.walletAddress ?? wallet.address,
    })
    void sendEyesEmail({ to: created.email, ...welcome })

    const cookieVal = createEyesAccountCookieValue({
      accountId: created.id,
      email: created.email,
    })
    const res = NextResponse.json({
      ok: true,
      account: created,
      walletEnc: wallet,
    })
    res.cookies.set(eyesAccountCookieOptions(cookieVal))
    return res
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Signup failed' },
      { status: 400 },
    )
  }
}

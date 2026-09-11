import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/eyes-account/password'
import { deriveSolanaAddressFromEncryptedWallet } from '@/lib/eyes-account/solana-from-wallet'
import {
  createEyesAccountCookieValue,
  eyesAccountCookieOptions,
} from '@/lib/eyes-account/session'
import { backfillEyesAccountSolanaAddress, getEyesAccountAuth } from '@/lib/eyes-account/store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 30
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('eyes-account-login', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const auth = await getEyesAccountAuth(email)
  if (!auth?.passwordHash || !auth.walletEnc) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (!verifyPassword(password, auth.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  let solanaAddress = auth.solanaAddress ?? null
  try {
    const derived = await deriveSolanaAddressFromEncryptedWallet(password, auth.walletEnc)
    if (!solanaAddress || solanaAddress !== derived) {
      const updated = await backfillEyesAccountSolanaAddress({
        email: auth.email,
        solanaAddress: derived,
        onlyIfMissing: !auth.solanaAddress,
      })
      solanaAddress = updated?.solanaAddress ?? derived
    }
  } catch {
    // Login still succeeds — Solana address syncs on next unlock.
  }

  const cookieVal = createEyesAccountCookieValue({ accountId: auth.id, email: auth.email })
  const res = NextResponse.json({
    ok: true,
    account: {
      id: auth.id,
      email: auth.email,
      walletAddress: auth.walletAddress,
      solanaAddress,
      hasWallet: true,
      createdAt: auth.walletEnc.createdAt,
    },
    walletEnc: auth.walletEnc,
  })
  res.cookies.set(eyesAccountCookieOptions(cookieVal))
  return res
}

import { NextRequest, NextResponse } from 'next/server'

import { getEyesAccountFromCookies } from '@/lib/eyes-account/session'
import { deriveSolanaAddressFromEncryptedWallet } from '@/lib/eyes-account/solana-from-wallet'
import { backfillEyesAccountSolanaAddress, getEyesAccountAuth } from '@/lib/eyes-account/store'
import { verifyPassword } from '@/lib/eyes-account/password'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 20
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  const session = await getEyesAccountFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('eyes-account-solana', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const password = body.password ?? ''
  if (!password) {
    return NextResponse.json({ error: 'Password required to derive Solana address' }, { status: 400 })
  }

  const auth = await getEyesAccountAuth(session.email)
  if (!auth?.passwordHash || !auth.walletEnc) {
    return NextResponse.json({ error: 'Account wallet not found' }, { status: 404 })
  }
  if (!verifyPassword(password, auth.passwordHash)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  let solanaAddress: string
  try {
    solanaAddress = await deriveSolanaAddressFromEncryptedWallet(password, auth.walletEnc)
  } catch {
    return NextResponse.json({ error: 'Could not derive Solana address' }, { status: 400 })
  }

  if (auth.solanaAddress === solanaAddress) {
    return NextResponse.json({
      ok: true,
      account: {
        id: auth.id,
        email: auth.email,
        walletAddress: auth.walletAddress as `0x${string}` | null,
        solanaAddress,
        hasWallet: Boolean(auth.walletAddress),
        createdAt: auth.walletEnc.createdAt,
      },
    })
  }

  const account = await backfillEyesAccountSolanaAddress({
    email: session.email,
    solanaAddress,
    onlyIfMissing: !auth.solanaAddress,
  })
  if (!account) {
    return NextResponse.json({ error: 'Could not save Solana address' }, { status: 503 })
  }

  return NextResponse.json({
    ok: true,
    account,
    corrected: Boolean(auth.solanaAddress && auth.solanaAddress !== solanaAddress),
  })
}

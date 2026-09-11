import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { verifyPassword, hashPassword } from '@/lib/eyes-account/password'
import { getEyesAccountAuth } from '@/lib/eyes-account/store'
import { changeEyesAccountPassword } from '@/lib/settings/account-settings-store'
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  return null
}

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const ip = getClientIp(request)
  const limited = checkRateLimit('change-password', ip, LIMIT, WINDOW_MS)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: {
    currentPassword?: string
    newPassword?: string
    walletEncSalt?: string
    walletEncIv?: string
    walletEncCiphertext?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const currentPassword = body.currentPassword ?? ''
  const newPassword = body.newPassword ?? ''
  const passErr = validatePassword(newPassword)
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })
  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password required' }, { status: 400 })
  }
  if (!body.walletEncSalt || !body.walletEncIv || !body.walletEncCiphertext) {
    return NextResponse.json({ error: 'Re-encrypted wallet payload required' }, { status: 400 })
  }

  const auth = await getEyesAccountAuth(identity.email)
  if (!auth?.passwordHash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (!verifyPassword(currentPassword, auth.passwordHash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  try {
    await changeEyesAccountPassword({
      email: identity.email,
      passwordHash: hashPassword(newPassword),
      walletEncSalt: body.walletEncSalt,
      walletEncIv: body.walletEncIv,
      walletEncCiphertext: body.walletEncCiphertext,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not change password' },
      { status: 400 },
    )
  }
}

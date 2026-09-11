import { NextRequest, NextResponse } from 'next/server'

import { getEyesAccountIdentity } from '@/lib/account-identity'

import { verifyPassword } from '@/lib/eyes-account/password'

import { getEyesAccountAuth } from '@/lib/eyes-account/store'

import { deleteAccount } from '@/lib/settings/account-settings-store'

import { cookies } from 'next/headers'
import { EYES_ACCOUNT_COOKIE } from '@/lib/eyes-account/session'

import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'



export const dynamic = 'force-dynamic'



export async function POST(request: NextRequest) {

  const identity = await getEyesAccountIdentity()

  if (!identity) {

    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  }



  const ip = getClientIp(request)

  const limited = checkRateLimit('account-delete', ip, 5, 15 * 60 * 1000)

  if (!limited.ok) {

    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)

    return NextResponse.json(body, { status, headers })

  }



  let body: { password?: string; confirmEmail?: string }

  try {

    body = await request.json()

  } catch {

    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  }



  if (body.confirmEmail?.toLowerCase() !== identity.email.toLowerCase()) {

    return NextResponse.json({ error: 'Type your email exactly to confirm deletion' }, { status: 400 })

  }



  const auth = await getEyesAccountAuth(identity.email)

  if (!auth?.passwordHash || !verifyPassword(body.password ?? '', auth.passwordHash)) {

    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

  }



  try {

    await deleteAccount(identity.email)

    const store = await cookies()

    store.delete(EYES_ACCOUNT_COOKIE)

    return NextResponse.json({ ok: true })

  } catch (e) {

    return NextResponse.json(

      { error: e instanceof Error ? e.message : 'Could not delete account' },

      { status: 400 },

    )

  }

}



import { NextRequest, NextResponse } from 'next/server'

import { hashPassword } from '@/lib/eyes-account/password'

import { callBot } from '@/lib/bot-webhook'
import { formatBotServiceError } from '@/lib/bot-webhook'

import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'



export const dynamic = 'force-dynamic'



const LIMIT = 10

const WINDOW_MS = 15 * 60 * 1000



function validatePassword(password: string): string | null {

  if (password.length < 8) return 'Password must be at least 8 characters'

  return null

}



export async function POST(request: NextRequest) {

  const ip = getClientIp(request)

  const limited = checkRateLimit('reset-password', ip, LIMIT, WINDOW_MS)

  if (!limited.ok) {

    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)

    return NextResponse.json(body, { status, headers })

  }



  let body: { token?: string; password?: string }

  try {

    body = await request.json()

  } catch {

    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  }



  const token = body.token?.trim()

  const password = body.password ?? ''

  const passErr = validatePassword(password)

  if (!token) return NextResponse.json({ error: 'Reset token required' }, { status: 400 })

  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })



  const bot = await callBot<{ ok: true; email: string }>('/webhook/eyes-account/reset-password', {

    token,

    passwordHash: hashPassword(password),

  })



  if (!bot.ok) {

    return NextResponse.json(

      { error: formatBotServiceError(bot) },

      { status: 400 },

    )

  }



  return NextResponse.json({

    ok: true,

    message:

      'Password updated. Sign in with your new password. Your embedded wallet was reset — import your exported key from Profile if you saved one.',

  })

}



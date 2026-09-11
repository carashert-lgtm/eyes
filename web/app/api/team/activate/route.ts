import { NextRequest, NextResponse } from 'next/server'

import { activateTeamCodeViaBot } from '@/lib/bot-webhook'

import {

  createTeamSessionCookieValue,

  teamSessionCookieOptions,

} from '@/lib/team-auth'

import {

  checkRateLimit,

  getClientIp,

  rateLimitResponse,

} from '@/lib/security/rate-limit'



const LIMIT = 10

const WINDOW_MS = 15 * 60 * 1000



function mapActivateError(error: string, status: number): string {

  if (status === 429 || error.toLowerCase().includes('too many')) {

    return 'Too many activation attempts. Try again in 15 minutes.'

  }

  if (status === 401 || error.toLowerCase().includes('unauthorized')) {

    return 'Activation service auth failed. Owner: verify PLATFORM_API_SECRET matches on Vercel and Railway.'

  }

  if (status === 502 || status === 503 || error.toLowerCase().includes('unavailable')) {

    return 'Activation service is temporarily unavailable. Try again shortly.'

  }

  if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('expired')) {

    return 'Invalid or expired code. Run !teamcode create in Discord (Railway bot only — stop any local bot), then try the new code immediately.'

  }

  return error || 'Activation failed. Try a fresh !teamcode create in Discord.'

}



export async function POST(request: NextRequest) {

  const ip = getClientIp(request)

  const limited = checkRateLimit('team-activate', ip, LIMIT, WINDOW_MS)

  if (!limited.ok) {

    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)

    return NextResponse.json(body, { status, headers })

  }



  let body: { code?: string }

  try {

    body = (await request.json()) as { code?: string }

  } catch {

    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  }



  const code = body.code?.trim().toUpperCase().replace(/\s+/g, '')

  if (!code || !/^TEAM-[A-Z0-9]{8}$/.test(code)) {

    return NextResponse.json({ error: 'Invalid activation code format' }, { status: 400 })

  }



  const result = await activateTeamCodeViaBot(code, ip)

  if (!result.ok) {

    return NextResponse.json(

      { error: mapActivateError(result.error, result.status) },

      { status: result.status === 429 ? 429 : result.status === 401 ? 503 : 400 },

    )

  }



  const cookieValue = createTeamSessionCookieValue({

    sessionToken: result.data.sessionToken,

    discordId: result.data.discordId,

    username: result.data.username,

  })



  const response = NextResponse.json({

    ok: true,

    username: result.data.username,

  })

  response.cookies.set(teamSessionCookieOptions(cookieValue))

  return response

}



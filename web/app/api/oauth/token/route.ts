import { NextRequest, NextResponse } from 'next/server'
import { exchangeOAuthToken } from '@/lib/oauth/store'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = checkRateLimit('oauth-token', ip, 30, 15 * 60 * 1000)
  if (!limited.ok) {
    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)
    return NextResponse.json(body, { status, headers })
  }

  let body: {
    grant_type?: string
    code?: string
    client_id?: string
    client_secret?: string
    redirect_uri?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (body.grant_type !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }

  try {
    const token = await exchangeOAuthToken({
      code: body.code ?? '',
      clientId: body.client_id ?? '',
      clientSecret: body.client_secret ?? '',
      redirectUri: body.redirect_uri ?? '',
    })
    return NextResponse.json({
      access_token: token.accessToken,
      token_type: token.tokenType,
      scope: token.scopes?.join(' '),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: e instanceof Error ? e.message : 'Failed' },
      { status: 400 },
    )
  }
}

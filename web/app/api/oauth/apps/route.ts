import { NextRequest, NextResponse } from 'next/server'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { createOAuthApp, listOAuthApps } from '@/lib/oauth/store'
import { normalizeScopes } from '@/lib/api-keys/store'
import type { ApiKeyScope } from '@/lib/settings/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity?.accountId) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }
  const apps = await listOAuthApps(identity.accountId)
  return NextResponse.json({ ok: true, apps })
}

export async function POST(request: NextRequest) {
  const identity = await getEyesAccountIdentity()
  if (!identity?.accountId) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  let body: { name?: string; redirectUris?: string[]; scopes?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'App name required' }, { status: 400 })
  const redirectUris = (body.redirectUris ?? []).filter((u) => u.startsWith('https://'))
  if (!redirectUris.length) {
    return NextResponse.json({ error: 'At least one HTTPS redirect URI required' }, { status: 400 })
  }

  try {
    const { app, clientSecret } = await createOAuthApp({
      accountId: identity.accountId,
      name,
      redirectUris,
      scopes: normalizeScopes(body.scopes ?? ['launches:read']) as ApiKeyScope[],
    })
    return NextResponse.json({
      ok: true,
      app,
      clientSecret,
      message: 'Copy the client secret now — it will not be shown again.',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not create app' },
      { status: 400 },
    )
  }
}

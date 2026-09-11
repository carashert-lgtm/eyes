import { NextRequest } from 'next/server'
import { authenticateApiKey } from '@/lib/api-keys/store'
import type { ApiKeyRecord, ApiKeyScope } from '@/lib/settings/types'

export function extractApiKey(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const header = request.headers.get('x-eyes-api-key')?.trim()
  return header || null
}

export async function requireApiKey(
  request: NextRequest,
  scope?: ApiKeyScope,
): Promise<{ ok: true; key: ApiKeyRecord } | { ok: false; status: number; error: string }> {
  const raw = extractApiKey(request)
  if (!raw) {
    return { ok: false, status: 401, error: 'Missing API key — use Authorization: Bearer eok_live_…' }
  }

  const key = await authenticateApiKey(raw)
  if (!key) {
    return { ok: false, status: 401, error: 'Invalid or revoked API key' }
  }

  if (scope && !key.scopes.includes(scope)) {
    return { ok: false, status: 403, error: `API key missing scope: ${scope}` }
  }

  return { ok: true, key }
}

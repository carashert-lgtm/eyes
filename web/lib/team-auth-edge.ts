import { getTeamSessionSecret } from '@/lib/security/session-secret'

/** Edge-safe session cookie checks for middleware (no Node crypto). */

export const TEAM_SESSION_COOKIE = 'eyes_team_session'

export type TeamSessionEdge = {
  sessionToken: string
  discordId: string | null
  username: string | null
  exp: number
}

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? padded : padded + '='.repeat(4 - (padded.length % 4))
  return atob(pad)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function hmacSha256Base64Url(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function getSessionSecret(): string {
  return getTeamSessionSecret()
}

export async function parseTeamSessionCookieEdge(
  raw: string | undefined | null,
): Promise<TeamSessionEdge | null> {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = await hmacSha256Base64Url(payload, getSessionSecret())
  if (!timingSafeEqual(sig, expected)) return null

  try {
    const data = JSON.parse(decodeBase64Url(payload)) as {
      t?: string
      d?: string | null
      u?: string | null
      e?: number
    }
    if (!data.t || !data.e || data.e < Math.floor(Date.now() / 1000)) return null
    return {
      sessionToken: data.t,
      discordId: data.d ?? null,
      username: data.u ?? null,
      exp: data.e,
    }
  } catch {
    return null
  }
}

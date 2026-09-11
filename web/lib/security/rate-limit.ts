import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

const stores = new Map<string, Map<string, Bucket>>()

function getStore(name: string): Map<string, Bucket> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number }

/** In-memory limiter — best-effort on serverless; still blocks burst abuse per instance. */
export function checkRateLimit(
  storeName: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const store = getStore(storeName)
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }

  entry.count += 1
  if (entry.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  return { ok: true, remaining: limit - entry.count }
}

export function rateLimitResponse(retryAfterSec: number) {
  return {
    status: 429 as const,
    body: { error: 'Too many requests. Try again later.' },
    headers: { 'Retry-After': String(retryAfterSec) },
  }
}

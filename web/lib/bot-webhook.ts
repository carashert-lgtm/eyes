type BotJsonResponse<T> = T | { error?: string; ok?: boolean }

async function callBot<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const base = process.env.BOT_WEBHOOK_URL
  if (!base) {
    return {
      ok: false,
      error: 'Activation service is temporarily unavailable.',
      status: 503,
    }
  }

  const isLocalWebhook =
    base.includes('localhost') || base.includes('127.0.0.1') || base.includes('0.0.0.0')
  if (isLocalWebhook && process.env.VERCEL === '1') {
    return {
      ok: false,
      error: 'Activation service is temporarily unavailable.',
      status: 503,
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (process.env.PLATFORM_API_SECRET) {
    headers['x-platform-secret'] = process.env.PLATFORM_API_SECRET
  } else if (process.env.VERCEL === '1') {
    console.warn('[bot-webhook] PLATFORM_API_SECRET not set — outbound bot calls are unsigned')
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const raw = await res.text()
    let data: BotJsonResponse<T> = {}
    if (raw) {
      try {
        data = JSON.parse(raw) as BotJsonResponse<T>
      } catch {
        data = {}
      }
    }
    if (!res.ok) {
      const err =
        typeof data === 'object' && data && 'error' in data && data.error
          ? String(data.error)
          : res.status === 404
            ? 'Settings service route not found — bot may need redeploying'
            : `Request failed (HTTP ${res.status})`
      return { ok: false, error: err, status: res.status }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'Could not reach activation service', status: 502 }
  }
}

export type BotFailure = { ok: false; error: string; status: number }

export function formatBotServiceError(
  bot: BotFailure,
  fallback = 'Account service is temporarily unavailable. Try again shortly.',
): string {
  if (bot.status === 401 || bot.error.toLowerCase().includes('unauthorized')) {
    return 'Service auth failed. Verify PLATFORM_API_SECRET matches on Vercel and Railway.'
  }
  if (bot.status === 404) {
    return bot.error || 'Settings service not found — redeploy the Discord bot on Railway.'
  }
  if (bot.status === 502 || bot.status === 503 || bot.error.toLowerCase().includes('unavailable')) {
    return 'Account service is temporarily unavailable. Try again shortly.'
  }
  return bot.error || fallback
}

export function botServiceError(
  bot: BotFailure,
  fallback?: string,
): Error {
  return new Error(formatBotServiceError(bot, fallback))
}

export type TeamActivateResult = {
  ok: true
  sessionToken: string
  discordId: string | null
  username: string | null
  code: string
}

export type TeamSessionResult = {
  ok: true
  session: {
    sessionToken: string
    discordId: string | null
    username: string | null
    codeUsed: string
    createdAt: string
  }
}

export async function activateTeamCodeViaBot(code: string, clientIp: string) {
  return callBot<TeamActivateResult>('/webhook/team-activate', { code, clientIp })
}

export async function validateTeamSessionViaBot(token: string) {
  return callBot<TeamSessionResult>('/webhook/team-session', { token })
}

export type BoostNotifyPayload = {
  launchId: string
  launchName: string
  launchSymbol: string
  numericLaunchId: number
  tokenAddress: string
  fomoUrl?: string
  packageId: string
  packageLabel: string
  durationHours: number
  rankMultiplier: number
  eyesSpent: number
  burnAmount: number
  expiresAt: string
  wallet: string
  txHash: string
}

export async function notifyBoostViaBot(payload: BoostNotifyPayload) {
  return callBot<{ ok: true; channelId?: string; duplicate?: boolean }>(
    '/webhook/boost/notify',
    payload,
  )
}

/** @deprecated use callBot helpers */
async function forwardToBot(path: string, body: Record<string, unknown>) {
  const result = await callBot(path, body)
  return result.ok
}

export { forwardToBot, callBot }

const APP_ENV =
  process.env.NEXT_PUBLIC_APP_ENV ??
  (process.env.NODE_ENV === 'production' ? 'production' : 'local')

const DEV_FALLBACK = 'dev-team-session-change-me'

export function getTeamSessionSecret(): string {
  const secret =
    process.env.TEAM_SESSION_SECRET?.trim() ||
    process.env.PLATFORM_API_SECRET?.trim() ||
    ''

  if (secret) return secret

  if (APP_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error(
      '[security] TEAM_SESSION_SECRET or PLATFORM_API_SECRET is required in production',
    )
  }

  return DEV_FALLBACK
}

export function assertProductionSecrets() {
  if (APP_ENV !== 'production' && process.env.VERCEL !== '1') return

  const errors: string[] = []

  if (!process.env.TEAM_SESSION_SECRET?.trim() && !process.env.PLATFORM_API_SECRET?.trim()) {
    errors.push('TEAM_SESSION_SECRET or PLATFORM_API_SECRET is required')
  }

  if (!process.env.PLATFORM_API_SECRET?.trim()) {
    errors.push('PLATFORM_API_SECRET is required for bot webhook authentication')
  }

  const botUrl = process.env.BOT_WEBHOOK_URL?.trim() ?? ''
  if (!botUrl) {
    errors.push('BOT_WEBHOOK_URL is required in production')
  } else if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(botUrl)) {
    errors.push('BOT_WEBHOOK_URL must not point to localhost in production')
  }

  if (errors.length > 0) {
    throw new Error(`[production security] ${errors.join('; ')}`)
  }
}

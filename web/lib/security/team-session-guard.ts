import type { TeamSession } from '@/lib/team-auth'
import { validateTeamSessionViaBot } from '@/lib/bot-webhook'

/** Validates signed cookie and optionally confirms session is still active with the bot. */
export async function assertActiveTeamSession(
  session: TeamSession | null,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!session) {
    return { ok: false, status: 401, error: 'Team Space access required' }
  }

  if (!process.env.BOT_WEBHOOK_URL) {
    return { ok: true }
  }

  const bot = await validateTeamSessionViaBot(session.sessionToken)
  if (!bot.ok) {
    return { ok: false, status: 401, error: 'Session expired — activate again' }
  }

  return { ok: true }
}

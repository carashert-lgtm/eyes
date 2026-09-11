import type { Metadata } from 'next'
import { TeamShell } from '@/components/team/TeamShell'
import { TeamPoolPageClient } from '@/components/team/TeamPoolPageClient'
import { getTeamSessionFromCookies } from '@/lib/team-auth'
import { FOUNDER_SHARE } from '@/lib/founder-share-config'
import { EyesAccountProvider } from '@/components/providers/EyesAccountProvider'

export const metadata: Metadata = {
  title: 'Team Pool | Eyes Open ($EYES)',
  description: `Private owner allocation pool — ${FOUNDER_SHARE.totalTokens.toLocaleString()} $EYES (${FOUNDER_SHARE.totalPercent}% owner).`,
  robots: { index: false, follow: false },
}

export default async function TeamPoolPage() {
  const session = await getTeamSessionFromCookies()

  return (
    <EyesAccountProvider>
      <TeamShell username={session?.username}>
        <TeamPoolPageClient
          sessionUsername={session?.username}
          sessionDiscordId={session?.discordId}
        />
      </TeamShell>
    </EyesAccountProvider>
  )
}

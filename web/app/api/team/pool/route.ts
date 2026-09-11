import { NextResponse } from 'next/server'

import { loadPoolSnapshot } from '@/lib/pool-data'

import { getTeamSessionFromCookies } from '@/lib/team-auth'

import { sanitizePoolSnapshotForSession } from '@/lib/security/pool-sanitize'

import { assertActiveTeamSession } from '@/lib/security/team-session-guard'



export async function GET() {

  const session = await getTeamSessionFromCookies()

  const auth = await assertActiveTeamSession(session)

  if (!auth.ok) {

    return NextResponse.json({ error: auth.error }, { status: auth.status })

  }



  const snapshot = await loadPoolSnapshot()

  return NextResponse.json(

    sanitizePoolSnapshotForSession(snapshot, session!.discordId),

  )

}


import { NextResponse } from 'next/server'

import { getTeamSessionFromCookies } from '@/lib/team-auth'

import { assertActiveTeamSession } from '@/lib/security/team-session-guard'



export async function GET() {

  const session = await getTeamSessionFromCookies()

  const auth = await assertActiveTeamSession(session)

  if (!auth.ok) {

    return NextResponse.json({ authenticated: false, error: auth.error }, { status: auth.status })

  }



  return NextResponse.json({

    authenticated: true,

    username: session!.username,

  })

}


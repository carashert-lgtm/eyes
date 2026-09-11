import { NextRequest, NextResponse } from 'next/server'

import { findUserInSnapshot, loadPoolSnapshot } from '@/lib/pool-data'

import { getTeamSessionFromCookies } from '@/lib/team-auth'

import { canViewPoolUser } from '@/lib/security/pool-sanitize'

import { assertActiveTeamSession } from '@/lib/security/team-session-guard'

import { normalizeEthAddress } from '@/lib/security/validation'



export async function GET(request: NextRequest) {

  const session = await getTeamSessionFromCookies()

  const auth = await assertActiveTeamSession(session)

  if (!auth.ok) {

    return NextResponse.json({ error: auth.error }, { status: auth.status })

  }



  const snapshot = await loadPoolSnapshot()

  const sessionUser = session!.discordId

    ? findUserInSnapshot(snapshot, { discordId: session!.discordId })

    : null

  const sessionWallet = sessionUser?.walletAddress ?? null



  const requestedWallet = normalizeEthAddress(

    request.nextUrl.searchParams.get('wallet') ?? '',

  )

  const requestedDiscordId = request.nextUrl.searchParams.get('discordId')



  if (requestedDiscordId && requestedDiscordId !== session!.discordId) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  }



  const discordId = session!.discordId ?? requestedDiscordId

  const wallet = requestedWallet ?? (sessionWallet as `0x${string}` | null)



  if (!discordId && !wallet) {

    return NextResponse.json({ user: null })

  }



  const user = findUserInSnapshot(snapshot, {

    discordId: discordId ?? undefined,

    wallet: wallet ?? undefined,

  })



  if (

    user &&

    !canViewPoolUser(

      session!.discordId,

      sessionWallet,

      user,

      requestedWallet,

      requestedDiscordId,

    )

  ) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  }



  return NextResponse.json({ user: user ?? null })

}


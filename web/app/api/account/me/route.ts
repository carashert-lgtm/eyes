import { NextResponse } from 'next/server'
import { getAccountProfile, linkAppAccount } from '@/lib/account-store'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { getTeamSessionFromCookies } from '@/lib/team-auth'

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ ok: true, signedIn: false })
  }

  let profile = await getAccountProfile({ email: identity.email })

  const team = await getTeamSessionFromCookies()
  if (team?.discordId && profile && !profile.account.discordId) {
    await linkAppAccount({
      email: identity.email,
      discordId: team.discordId,
    })
    profile = (await getAccountProfile({ email: identity.email })) ?? profile
  }

  return NextResponse.json({
    ok: true,
    signedIn: true,
    email: identity.email,
    profile,
  })
}

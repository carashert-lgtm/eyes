import { NextResponse } from 'next/server'
import { getEyesAccountFromCookies } from '@/lib/eyes-account/session'
import { getEyesAccountAuth, getEyesAccountById } from '@/lib/eyes-account/store'

export async function GET() {
  const session = await getEyesAccountFromCookies()
  if (!session) {
    return NextResponse.json({ ok: true, signedIn: false })
  }

  const account = await getEyesAccountById(session.accountId)
  if (!account) {
    return NextResponse.json({ ok: true, signedIn: false })
  }

  const auth = await getEyesAccountAuth(session.email)
  if (!auth?.walletEnc) {
    return NextResponse.json({ ok: true, signedIn: true, account, walletUnlocked: false })
  }

  return NextResponse.json({
    ok: true,
    signedIn: true,
    account,
    walletEnc: {
      v: auth.walletEnc.v,
      address: auth.walletEnc.address,
      saltB64: auth.walletEnc.saltB64,
      ivB64: auth.walletEnc.ivB64,
      ciphertextB64: auth.walletEnc.ciphertextB64,
      createdAt: auth.walletEnc.createdAt,
    },
  })
}

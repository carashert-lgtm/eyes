import { NextResponse } from 'next/server'
import { getEyesAccountIdentity } from '@/lib/account-identity'
import { exportAccountData } from '@/lib/settings/account-settings-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const identity = await getEyesAccountIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  try {
    const data = await exportAccountData(identity.email)
    return NextResponse.json({ ok: true, export: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Export failed' },
      { status: 400 },
    )
  }
}

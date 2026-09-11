import { getEyesAccountFromCookies } from '@/lib/eyes-account/session'
import { getEyesAccountAuth } from '@/lib/eyes-account/store'
import { linkAppAccount } from '@/lib/account-store'

export type AccountIdentity = {
  accountId: string
  email: string
  walletAddress: string | null
  solanaAddress: string | null
}

/** Resolve the signed-in Eyes account for email updates (wallet users only). */
export async function getEyesAccountIdentity(): Promise<AccountIdentity | null> {
  const session = await getEyesAccountFromCookies()
  if (!session) return null

  const auth = await getEyesAccountAuth(session.email)
  if (!auth?.passwordHash) return null

  const walletAddress = auth.walletAddress?.toLowerCase() ?? null
  if (walletAddress) {
    try {
      await linkAppAccount({ email: session.email, wallet: walletAddress })
    } catch {
      // Profile sync is best-effort; prefs still work by email.
    }
  }

  return {
    accountId: auth.id,
    email: session.email,
    walletAddress,
    solanaAddress: auth.solanaAddress?.trim() || null,
  }
}

import type { WalletUnlockSession } from '@/lib/eyes-account/types'
import { isWalletSessionValid } from '@/lib/wallet-session-verify'

const STORAGE_KEY = 'eyes_wallet_unlock_v1'
const LOCKED_KEY = 'eyes_wallet_locked_v1'

type StoredUnlock = WalletUnlockSession & {
  accountId: string
}

function canUseStorage() {
  return typeof sessionStorage !== 'undefined'
}

/** User explicitly locked — do not auto-restore signing session on refresh. */
export function markWalletLocked() {
  if (!canUseStorage()) return
  sessionStorage.setItem(LOCKED_KEY, '1')
  sessionStorage.removeItem(STORAGE_KEY)
}

export function clearWalletLocked() {
  if (!canUseStorage()) return
  sessionStorage.removeItem(LOCKED_KEY)
}

export function isWalletExplicitlyLocked() {
  if (!canUseStorage()) return false
  return sessionStorage.getItem(LOCKED_KEY) === '1'
}

/** Keep wallet signing active for this browser tab until lock/logout. */
export function persistWalletUnlock(accountId: string, session: WalletUnlockSession) {
  if (!canUseStorage()) return
  clearWalletLocked()
  const payload: StoredUnlock = { accountId, ...session }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function restoreWalletUnlock(accountId: string): WalletUnlockSession | null {
  if (!canUseStorage() || isWalletExplicitlyLocked()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredUnlock
    if (data.accountId !== accountId || !data.address || !data.privateKey) return null
    if (!isWalletSessionValid(data)) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return { address: data.address, privateKey: data.privateKey }
  } catch {
    return null
  }
}

export function clearWalletUnlock() {
  if (!canUseStorage()) return
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(LOCKED_KEY)
}

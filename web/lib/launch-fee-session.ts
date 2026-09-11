const STORAGE_KEY = 'eyes_launch_fee_pending_v1'

export type PendingLaunchFee = {
  wallet: string
  burnTxHash: string
  treasuryTxHash?: string
  savedAt: string
}

function canUseStorage() {
  return typeof sessionStorage !== 'undefined'
}

export function savePendingLaunchFee(fee: PendingLaunchFee) {
  if (!canUseStorage()) return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fee))
}

export function loadPendingLaunchFee(wallet: string): PendingLaunchFee | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PendingLaunchFee
    if (data.wallet?.toLowerCase() !== wallet.toLowerCase()) return null
    if (!data.burnTxHash) return null
    return data
  } catch {
    return null
  }
}

export function clearPendingLaunchFee() {
  if (!canUseStorage()) return
  sessionStorage.removeItem(STORAGE_KEY)
}

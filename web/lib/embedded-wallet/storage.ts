import type { StoredEmbeddedWallet } from '@/lib/embedded-wallet/types'

const STORAGE_KEY = 'eyes-embedded-wallet-v1'

export function loadStoredWallet(): StoredEmbeddedWallet | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredEmbeddedWallet
    if (parsed?.v !== 1 || !parsed.address?.startsWith('0x')) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredWallet(wallet: StoredEmbeddedWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet))
}

export function clearStoredWallet(): void {
  localStorage.removeItem(STORAGE_KEY)
}

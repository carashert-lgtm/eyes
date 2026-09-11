import { getAddress, isAddress } from 'viem'

export const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/

export function isValidTxHash(value: string | undefined | null): value is `0x${string}` {
  return Boolean(value && TX_HASH_RE.test(value.trim()))
}

export function normalizeEthAddress(value: string): `0x${string}` | null {
  const trimmed = value.trim()
  if (!isAddress(trimmed)) return null
  try {
    return getAddress(trimmed)
  } catch {
    return null
  }
}

export function normalizeReferralCode(value: string | undefined | null): string | null {
  if (!value) return null
  const code = value.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return null
  return code
}

import type { WalletUnlockSession } from '@/lib/eyes-account/types'
import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex } from 'viem'

const PK_RE = /^0x[0-9a-fA-F]{64}$/

export function normalizePrivateKeyHex(hex: string): Hex | null {
  const trimmed = hex.trim()
  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  return PK_RE.test(withPrefix) ? (withPrefix as Hex) : null
}

/** Ensure unlock session key matches the displayed deposit address. */
export function assertWalletSessionIntegrity(session: WalletUnlockSession): Address {
  const pk = normalizePrivateKeyHex(session.privateKey)
  if (!pk) {
    throw new Error('Wallet unlock is invalid. Log out, log in, and unlock your Eyes wallet again.')
  }
  const account = privateKeyToAccount(pk)
  if (account.address.toLowerCase() !== session.address.toLowerCase()) {
    throw new Error(
      'Wallet unlock does not match your deposit address. Log out, log in, and unlock again.',
    )
  }
  return account.address
}

export function isWalletSessionValid(session: WalletUnlockSession | null | undefined): boolean {
  if (!session?.privateKey || !session.address) return false
  try {
    assertWalletSessionIntegrity(session)
    return true
  } catch {
    return false
  }
}

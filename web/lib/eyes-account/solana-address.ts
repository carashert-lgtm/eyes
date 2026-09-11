import { deriveSolanaAddressFromEvmPrivateKey as deriveAddress } from '@/lib/eyes-account/solana-keypair'

/** Deterministic Solana deposit address paired with the Eyes EVM wallet. */
export function deriveSolanaAddressFromEvmPrivateKey(evmPrivateKey: `0x${string}`): string {
  return deriveAddress(evmPrivateKey)
}

export function isValidSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
}

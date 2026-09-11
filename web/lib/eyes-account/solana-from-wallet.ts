import { decryptPrivateKey } from '@/lib/eyes-account/wallet'
import { deriveSolanaAddressFromEvmPrivateKey } from '@/lib/eyes-account/solana-address'
import type { EncryptedWalletBlob } from '@/lib/eyes-account/types'

/** Derive the paired Solana deposit address from an encrypted Eyes wallet + password. */
export async function deriveSolanaAddressFromEncryptedWallet(
  password: string,
  wallet: EncryptedWalletBlob,
): Promise<string> {
  const hex = await decryptPrivateKey(password, wallet.saltB64, wallet.ivB64, wallet.ciphertextB64)
  const pk = (hex.startsWith('0x') ? hex : `0x${hex}`) as `0x${string}`
  return deriveSolanaAddressFromEvmPrivateKey(pk)
}

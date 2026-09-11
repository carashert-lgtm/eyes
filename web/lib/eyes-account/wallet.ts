import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { encryptPrivateKey } from '@/lib/embedded-wallet/crypto'
import type { EncryptedWalletBlob } from '@/lib/eyes-account/types'

export async function createEncryptedWalletBlob(
  password: string,
): Promise<{ wallet: EncryptedWalletBlob; privateKey: `0x${string}` }> {
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  const pk = generatePrivateKey()
  const account = privateKeyToAccount(pk)
  const enc = await encryptPrivateKey(pk.replace(/^0x/, ''), password)
  return {
    privateKey: pk,
    wallet: {
      v: 1,
      address: account.address,
      saltB64: enc.saltB64,
      ivB64: enc.ivB64,
      ciphertextB64: enc.ciphertextB64,
      createdAt: new Date().toISOString(),
    },
  }
}

export { decryptPrivateKey } from '@/lib/embedded-wallet/crypto'

/** Encrypted wallet blob — private key never stored in plaintext on server. */
export type EncryptedWalletBlob = {
  v: 1
  address: `0x${string}`
  saltB64: string
  ivB64: string
  ciphertextB64: string
  createdAt: string
}

export type EyesAccountPublic = {
  id: string
  email: string
  walletAddress: `0x${string}` | null
  /** Paired Solana deposit address (same Eyes account). */
  solanaAddress?: string | null
  hasWallet: boolean
  createdAt: string
}

export type EyesAccountSession = {
  accountId: string
  email: string
  exp: number
}

export type WalletUnlockSession = {
  address: `0x${string}`
  privateKey: `0x${string}`
}

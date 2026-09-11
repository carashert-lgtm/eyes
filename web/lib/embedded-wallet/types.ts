/** Client-only encrypted Eyes Wallet blob (localStorage). Never sent to server. */
export type StoredEmbeddedWallet = {
  v: 1
  address: `0x${string}`
  saltB64: string
  ivB64: string
  ciphertextB64: string
  createdAt: string
}

export type EmbeddedWalletSession = {
  address: `0x${string}`
  /** In-memory only — cleared on lock / tab close. */
  privateKey: `0x${string}`
}

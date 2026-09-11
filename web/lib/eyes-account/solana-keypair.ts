import { keccak256, toBytes } from 'viem'
import { Keypair } from '@solana/web3.js'

const SOLANA_DERIVE_PREFIX = 'eyes-open-solana-v1:'

function seedBytesFromEvmPrivateKey(evmPrivateKey: `0x${string}`): Uint8Array {
  const hex = evmPrivateKey.replace(/^0x/, '')
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('Invalid EVM private key')
  }
  const seedHex = keccak256(toBytes(`${SOLANA_DERIVE_PREFIX}${hex}`)).slice(2, 66)
  const seedBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    seedBytes[i] = Number.parseInt(seedHex.slice(i * 2, i * 2 + 2), 16)
  }
  return seedBytes
}

/** Deterministic Solana keypair paired with the Eyes EVM wallet (client-side signing). */
export function deriveSolanaKeypairFromEvmPrivateKey(evmPrivateKey: `0x${string}`): Keypair {
  return Keypair.fromSeed(seedBytesFromEvmPrivateKey(evmPrivateKey))
}

export function deriveSolanaAddressFromEvmPrivateKey(evmPrivateKey: `0x${string}`): string {
  return deriveSolanaKeypairFromEvmPrivateKey(evmPrivateKey).publicKey.toBase58()
}

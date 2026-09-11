/**
 * Chain / environment flags — safe for server and client (no wagmi imports).
 *
 * Anvil is ONLY active when NEXT_PUBLIC_APP_ENV=local AND NEXT_PUBLIC_USE_ANVIL=true.
 * Production builds and eyesopen.to must never use chain 31337.
 */

export type AppEnvironment = 'local' | 'staging' | 'production'

export const APP_ENV: AppEnvironment =
  (process.env.NEXT_PUBLIC_APP_ENV as AppEnvironment | undefined) ??
  (process.env.NODE_ENV === 'production' ? 'production' : 'local')

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.eyesopen.to'

const RAW_USE_ANVIL = process.env.NEXT_PUBLIC_USE_ANVIL === 'true'
const IS_PUBLIC_DOMAIN = /eyesopen\.to/i.test(SITE_URL)

/** Local Foundry Anvil — never on production app env or public domain config. */
export const IS_LOCAL_ANVIL =
  APP_ENV === 'local' && RAW_USE_ANVIL && !IS_PUBLIC_DOMAIN

if (APP_ENV === 'production' && RAW_USE_ANVIL) {
  console.error(
    '[config] NEXT_PUBLIC_USE_ANVIL=true is ignored in production. Set NEXT_PUBLIC_APP_ENV=production and USE_ANVIL=false.',
  )
}

export const ANVIL_CHAIN_ID = 31_337

export const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'

/** Anvil account #0 — local testing only. Never use as production treasury. */
export const ANVIL_DEFAULT_TREASURY =
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const

export const BASE_MAINNET_CHAIN_ID = 8453
export const BASE_SEPOLIA_CHAIN_ID = 84_532

const DEFAULT_PRODUCTION_CHAIN_ID = BASE_MAINNET_CHAIN_ID
const DEFAULT_STAGING_CHAIN_ID = BASE_SEPOLIA_CHAIN_ID

export const ACTIVE_CHAIN_ID = IS_LOCAL_ANVIL
  ? ANVIL_CHAIN_ID
  : Number(
      process.env.NEXT_PUBLIC_CHAIN_ID ??
        String(APP_ENV === 'staging' ? DEFAULT_STAGING_CHAIN_ID : DEFAULT_PRODUCTION_CHAIN_ID),
    )

export const ACTIVE_CHAIN_NAME = IS_LOCAL_ANVIL
  ? (process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'Anvil Local')
  : (process.env.NEXT_PUBLIC_CHAIN_NAME ??
      (APP_ENV === 'staging' ? 'Base Sepolia' : 'Base'))

/** Block explorer tx URL prefix for the active wallet chain. */
export const BLOCK_EXPLORER_TX_PREFIX = IS_LOCAL_ANVIL
  ? null
  : APP_ENV === 'production'
    ? 'https://basescan.org/tx/'
    : 'https://sepolia.basescan.org/tx/'

export const BLOCK_EXPLORER_ADDRESS_PREFIX = IS_LOCAL_ANVIL
  ? null
  : APP_ENV === 'production'
    ? 'https://basescan.org/address/'
    : 'https://sepolia.basescan.org/address/'

export function blockExplorerTxUrl(hash: string): string | null {
  if (!BLOCK_EXPLORER_TX_PREFIX) return null
  return `${BLOCK_EXPLORER_TX_PREFIX}${hash}`
}

export function blockExplorerAddressUrl(address: string): string | null {
  if (!BLOCK_EXPLORER_ADDRESS_PREFIX) return null
  return `${BLOCK_EXPLORER_ADDRESS_PREFIX}${address}`
}


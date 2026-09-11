import { defineChain } from 'viem'
import { base, baseSepolia, mainnet } from 'viem/chains'
import {
  ANVIL_CHAIN_ID,
  ANVIL_RPC_URL,
  APP_ENV,
  IS_LOCAL_ANVIL,
} from '@/lib/chain-config'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'

export const anvilLocal = defineChain({
  id: ANVIL_CHAIN_ID,
  name: 'Anvil Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [ANVIL_RPC_URL],
      webSocket: [ANVIL_RPC_URL.replace(/^http/i, 'ws')],
    },
  },
  testnet: true,
})

/** Active chain for Eyes embedded wallet transactions. */
export const ACTIVE_WALLET_CHAIN = IS_LOCAL_ANVIL
  ? anvilLocal
  : APP_ENV === 'production'
    ? base
    : baseSepolia

export { IS_LOCAL_ANVIL }

export function getPublicRpcUrl(): string {
  return getPublicRpcUrls()[0]
}

/** Browser-safe RPC list — never includes server-only Alchemy URLs. */
export function getClientRpcUrls(): string[] {
  if (IS_LOCAL_ANVIL) return [ANVIL_RPC_URL]
  return [...ACTIVE_WALLET_CHAIN.rpcUrls.default.http]
}

/** Ordered RPC endpoints — tries env provider first, then public Base fallbacks. Server only. */
export function getPublicRpcUrls(): string[] {
  if (IS_LOCAL_ANVIL) return [ANVIL_RPC_URL]

  const urls: string[] = []
  const fromEnv = process.env.BASE_MAINNET_RPC_URL?.trim()
  if (fromEnv) urls.push(fromEnv)
  const fallbacks = [
    ...ACTIVE_WALLET_CHAIN.rpcUrls.default.http,
    'https://base.publicnode.com',
    'https://base.drpc.org',
    'https://1rpc.io/base',
    'https://base.llamarpc.com',
  ]
  for (const url of fallbacks) {
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

export type LaunchEvmChainKey = Extract<LaunchChainKey, 'base' | 'ethereum'>

/** EVM chain for fair launch deploy signing (Base default; Ethereum mainnet when selected). */
export function getLaunchEvmChain(chainKey: LaunchEvmChainKey = 'base') {
  if (IS_LOCAL_ANVIL) return anvilLocal
  if (chainKey === 'ethereum') return mainnet
  return APP_ENV === 'production' ? base : baseSepolia
}

/** Server-side RPC list for launch deploy on Base or Ethereum mainnet. */
export function getLaunchRpcUrls(chainKey: LaunchEvmChainKey = 'base'): string[] {
  if (IS_LOCAL_ANVIL) return [ANVIL_RPC_URL]

  if (chainKey === 'ethereum') {
    const urls: string[] = []
    const fromEnv = process.env.ETHEREUM_MAINNET_RPC_URL?.trim()
    if (fromEnv) urls.push(fromEnv)
    const fallbacks = [
      ...mainnet.rpcUrls.default.http,
      'https://ethereum.publicnode.com',
      'https://1rpc.io/eth',
    ]
    for (const url of fallbacks) {
      if (url && !urls.includes(url)) urls.push(url)
    }
    return urls
  }

  return getPublicRpcUrls()
}

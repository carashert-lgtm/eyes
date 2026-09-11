import { ACTIVE_CHAIN_ID, ACTIVE_CHAIN_NAME, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'

const TRADE_LABELS: Record<LaunchChainKey, string> = {
  base: 'FOMO',
  ethereum: 'DEX',
  solana: 'Solana DEX',
}

export function getLaunchRecordId(chainKey: LaunchChainKey, launchId: number): string {
  return `${chainKey}-launch-${launchId}`
}

export function getLaunchTradeLabel(chainKey: LaunchChainKey): string {
  return TRADE_LABELS[chainKey]
}

export function getLaunchNativeFeeSymbol(chainKey: LaunchChainKey): string {
  return chainKey === 'solana' ? 'SOL' : 'ETH'
}

export const PLATFORM_STATUS = {
  network: IS_LOCAL_ANVIL ? 'Local' : APP_ENV === 'production' ? 'Mainnet' : 'Testnet',
  networkDetail: IS_LOCAL_ANVIL
    ? `${ACTIVE_CHAIN_NAME} · chain ${ACTIVE_CHAIN_ID}`
    : APP_ENV === 'production'
      ? 'Base · Ethereum · Solana'
      : 'Base Sepolia · pre-mainnet',
  wiringBadge: IS_LOCAL_ANVIL
    ? 'Local Anvil'
    : APP_ENV === 'production'
      ? 'Production'
      : 'Staging',
  disclaimer: IS_LOCAL_ANVIL ? 'Local dev only' : 'Mainnet',
} as const

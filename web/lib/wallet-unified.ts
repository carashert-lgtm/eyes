import type { LaunchChainKey } from '@/lib/launch-chains/registry'

export type WalletNetworkKey = LaunchChainKey

/** Networks that share the same 0x Eyes wallet address. */
export const EVM_WALLET_NETWORKS = ['base', 'ethereum'] as const satisfies readonly WalletNetworkKey[]

export type WalletNetworkOption = {
  key: WalletNetworkKey
  label: string
  shortLabel: string
  usesEvmAddress: boolean
}

export const WALLET_NETWORK_OPTIONS: WalletNetworkOption[] = [
  { key: 'base', label: 'Base', shortLabel: 'Base', usesEvmAddress: true },
  { key: 'ethereum', label: 'Ethereum', shortLabel: 'ETH', usesEvmAddress: true },
  { key: 'solana', label: 'Solana', shortLabel: 'SOL', usesEvmAddress: false },
]

/** Receive / payer address for one Eyes account on a selected network. */
export function depositAddressForNetwork(
  network: WalletNetworkKey,
  evmAddress: string | null | undefined,
  solanaAddress: string | null | undefined,
): string | null {
  if (network === 'solana') return solanaAddress?.trim() || null
  return evmAddress?.trim() || null
}

/** @deprecated use depositAddressForNetwork */
export function eyesAddressForChain(
  chainKey: LaunchChainKey,
  evmAddress: string | null | undefined,
  solanaAddress: string | null | undefined,
): string | null {
  return depositAddressForNetwork(chainKey, evmAddress, solanaAddress)
}

export type DepositAcceptedAsset = {
  symbol: string
  label: string
}

export type WalletSendAssetKey = 'native' | 'eyes'

export type WalletSendAssetOption = {
  key: WalletSendAssetKey
  symbol: string
  label: string
  /** Network where this asset lives (for display). */
  networkLabel: string
}

/** Assets users may deposit when sending to the address on this network. */
export function acceptedAssetsForNetwork(network: WalletNetworkKey): DepositAcceptedAsset[] {
  if (network === 'base') {
    return [
      { symbol: 'ETH', label: 'ETH on Base' },
      { symbol: '$EYES', label: '$EYES on Base' },
    ]
  }
  if (network === 'ethereum') {
    return [{ symbol: 'ETH', label: 'ETH on Ethereum mainnet only' }]
  }
  return [{ symbol: 'SOL', label: 'SOL on Solana only' }]
}

/** Hard rule shown above the address — wrong network = lost funds. */
export function networkOnlyWarning(network: WalletNetworkKey): string {
  if (network === 'base') {
    return 'Send only on Base. Do not send Ethereum-mainnet ETH or Solana assets to this 0x address.'
  }
  if (network === 'ethereum') {
    return 'Send only on Ethereum mainnet. Do not send Base ETH, $EYES, or Solana assets to this address.'
  }
  return 'Send only on Solana. Do not send ETH, $EYES, or other-chain tokens to this address.'
}

export function depositHintForNetwork(network: WalletNetworkKey): string {
  if (network === 'base') {
    return 'Your primary deposit — fund $EYES and ETH here for launches, fees, and staking.'
  }
  if (network === 'ethereum') {
    return 'Same 0x as Base, different network. Use for Ethereum deploy gas and LP only.'
  }
  return 'Paired Solana address for the same Eyes wallet. Fund SOL here for Solana launches.'
}

/** Assets the user can send out from the universal wallet on each network. */
export function sendAssetOptionsForNetwork(network: WalletNetworkKey): WalletSendAssetOption[] {
  if (network === 'base') {
    return [
      { key: 'native', symbol: 'ETH', label: 'ETH', networkLabel: 'Base' },
      { key: 'eyes', symbol: '$EYES', label: '$EYES', networkLabel: 'Base' },
    ]
  }
  if (network === 'ethereum') {
    return [{ key: 'native', symbol: 'ETH', label: 'ETH', networkLabel: 'Ethereum' }]
  }
  return [{ key: 'native', symbol: 'SOL', label: 'SOL', networkLabel: 'Solana' }]
}

export function explorerTxUrlForNetwork(network: WalletNetworkKey, hash: string): string | null {
  if (network === 'base') return `https://basescan.org/tx/${hash}`
  if (network === 'ethereum') return `https://etherscan.io/tx/${hash}`
  if (network === 'solana') return `https://solscan.io/tx/${hash}`
  return null
}

export function explorerUrlForNetwork(
  network: WalletNetworkKey,
  address: string,
): string | null {
  if (network === 'base') return `https://basescan.org/address/${address}`
  if (network === 'ethereum') return `https://etherscan.io/address/${address}`
  if (network === 'solana') return `https://solscan.io/account/${address}`
  return null
}

export type UnifiedNativeBalance = {
  chain: LaunchChainKey
  label: string
  symbol: 'ETH' | 'SOL'
  balance: number
  formatted: string
}

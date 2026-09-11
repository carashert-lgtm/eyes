import { isAddress } from 'viem'
import { APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'
import { CONTRACTS, FEATURES } from '@/lib/site-config'

/** Networks users can launch a token on. */
export type LaunchChainKey = 'base' | 'ethereum' | 'solana'

export type LaunchChainFamily = 'evm' | 'solana'

export type LaunchChainConfig = {
  key: LaunchChainKey
  label: string
  shortLabel: string
  family: LaunchChainFamily
  nativeSymbol: 'ETH' | 'SOL'
  evmChainId?: number
  /** On-chain fair launch deploy is live for this network. */
  deployEnabled: boolean
  /** Shown in UI when selected but deploy is not live yet. */
  comingSoon: boolean
  factoryAddress: string | null
  programId: string | null
  explorerTxPrefix: string | null
  explorerAddressPrefix: string | null
  lpDexLabel: string
  tradingAppLabel: string
  walletLabel: string
  defaultLpNative: string
  minLpNative: number
  enabled: boolean
}

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

const BASE_FACTORY =
  process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS?.trim() ||
  CONTRACTS.launchFactory ||
  ''

const SOLANA_PROGRAM =
  process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim() ?? ''

function parseEnabledKeys(): LaunchChainKey[] {
  const raw =
    process.env.NEXT_PUBLIC_LAUNCH_CHAINS?.trim() ||
    (APP_ENV === 'production' ? 'base,ethereum,solana' : 'base,solana')
  const keys = raw
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  const allowed: LaunchChainKey[] = ['base', 'ethereum', 'solana']
  return keys.filter((k): k is LaunchChainKey => allowed.includes(k as LaunchChainKey))
}

const ALL_CHAINS: Record<LaunchChainKey, Omit<LaunchChainConfig, 'enabled' | 'deployEnabled' | 'comingSoon'>> = {
  base: {
    key: 'base',
    label: 'Base',
    shortLabel: 'Base',
    family: 'evm',
    nativeSymbol: 'ETH',
    evmChainId: 8453,
    factoryAddress: BASE_FACTORY && isAddress(BASE_FACTORY) ? BASE_FACTORY : null,
    programId: null,
    explorerTxPrefix: 'https://basescan.org/tx/',
    explorerAddressPrefix: 'https://basescan.org/address/',
    lpDexLabel: 'Uniswap V2',
    tradingAppLabel: 'FOMO',
    walletLabel: 'Universal Eyes wallet · Base',
    defaultLpNative: process.env.NEXT_PUBLIC_LAUNCH_DEFAULT_LP_ETH?.trim() || '0.01',
    minLpNative: 0.01,
  },
  ethereum: {
    key: 'ethereum',
    label: 'Ethereum',
    shortLabel: 'ETH',
    family: 'evm',
    nativeSymbol: 'ETH',
    evmChainId: 1,
    factoryAddress: process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim() || null,
    programId: null,
    explorerTxPrefix: 'https://etherscan.io/tx/',
    explorerAddressPrefix: 'https://etherscan.io/address/',
    lpDexLabel: 'Uniswap V2',
    tradingAppLabel: 'DEX',
    walletLabel: 'Universal Eyes wallet · Ethereum',
    defaultLpNative: process.env.NEXT_PUBLIC_LAUNCH_DEFAULT_LP_ETH_MAINNET?.trim() || '0.05',
    minLpNative: 0.05,
  },
  solana: {
    key: 'solana',
    label: 'Solana',
    shortLabel: 'SOL',
    family: 'solana',
    nativeSymbol: 'SOL',
    factoryAddress: null,
    programId: SOLANA_PROGRAM && SOLANA_ADDRESS_RE.test(SOLANA_PROGRAM) ? SOLANA_PROGRAM : null,
    explorerTxPrefix: 'https://solscan.io/tx/',
    explorerAddressPrefix: 'https://solscan.io/account/',
    lpDexLabel: 'Raydium',
    tradingAppLabel: 'Solana DEX',
    walletLabel: 'Universal Eyes wallet · Solana',
    defaultLpNative: process.env.NEXT_PUBLIC_LAUNCH_DEFAULT_LP_SOL?.trim() || '0.05',
    minLpNative: 0.01,
  },
}

function resolveDeployState(chain: Omit<LaunchChainConfig, 'enabled' | 'deployEnabled' | 'comingSoon'>): {
  deployEnabled: boolean
  comingSoon: boolean
} {
  if (IS_LOCAL_ANVIL) {
    if (chain.key === 'base') {
      return {
        deployEnabled: FEATURES.createLaunchDeploy && Boolean(chain.factoryAddress),
        comingSoon: false,
      }
    }
    return { deployEnabled: false, comingSoon: true }
  }

  if (chain.key === 'base') {
    return {
      deployEnabled: FEATURES.createLaunchDeploy && Boolean(chain.factoryAddress),
      comingSoon: false,
    }
  }

  if (chain.key === 'ethereum') {
    const wired = Boolean(chain.factoryAddress && isAddress(chain.factoryAddress))
    return { deployEnabled: wired, comingSoon: !wired }
  }

  if (chain.key === 'solana') {
    const wired = Boolean(chain.programId)
    return { deployEnabled: wired, comingSoon: !wired }
  }

  return { deployEnabled: false, comingSoon: true }
}

export function getLaunchChain(key: LaunchChainKey | string | null | undefined): LaunchChainConfig {
  const resolvedKey = coerceLaunchChainKey(key)
  const chain = ALL_CHAINS[resolvedKey]
  const enabledKeys = parseEnabledKeys()
  const deploy = resolveDeployState(chain)
  return {
    ...chain,
    ...deploy,
    enabled: enabledKeys.includes(resolvedKey),
  }
}

export function getEnabledLaunchChains(): LaunchChainConfig[] {
  return parseEnabledKeys()
    .map((key) => getLaunchChain(key))
    .filter((chain) => chain.enabled)
}

export function getDefaultLaunchChain(): LaunchChainConfig {
  const enabled = getEnabledLaunchChains()
  return enabled.find((c) => c.key === 'base') ?? enabled[0] ?? getLaunchChain('base')
}

export function isLaunchChainKey(value: string): value is LaunchChainKey {
  return value === 'base' || value === 'ethereum' || value === 'solana'
}

function coerceLaunchChainKey(input: LaunchChainKey | string | null | undefined): LaunchChainKey {
  const raw = typeof input === 'string' ? input : ''
  return isLaunchChainKey(raw) ? raw : 'base'
}

export function resolveLaunchChain(input?: string | null): LaunchChainConfig {
  if (input && isLaunchChainKey(input)) {
    const chain = getLaunchChain(input)
    if (chain.enabled) return chain
  }
  return getDefaultLaunchChain()
}

export function isValidLaunchWallet(chain: LaunchChainConfig, address: string): boolean {
  const trimmed = address.trim()
  if (!trimmed) return false
  if (chain.family === 'evm') return isAddress(trimmed)
  return SOLANA_ADDRESS_RE.test(trimmed)
}

export function launchWalletHint(chain: LaunchChainConfig): string {
  if (chain.family === 'solana') {
    return 'Universal Eyes wallet — switch to the Solana tab to fund SOL. $EYES fees always settle on Base.'
  }
  if (chain.key === 'base') {
    return 'Universal Eyes wallet — send $EYES and ETH on Base to your 0x address below.'
  }
  return 'Universal Eyes wallet — same 0x as Base. Send ETH on Ethereum for deploy gas and LP.'
}

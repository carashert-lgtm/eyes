import { defaultSolanaRpcForCluster, getSolanaCluster, type SolanaCluster } from '@/lib/solana-cluster'

const MAINNET_PUBLIC_FALLBACKS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana.publicnode.com',
  'https://solana-mainnet.gateway.tatum.io',
] as const

const DEVNET_PUBLIC_FALLBACKS = ['https://api.devnet.solana.com'] as const

/** Ordered Solana RPC endpoints — env provider first, then public fallbacks. Server only for premium URLs. */
export function getSolanaRpcUrls(cluster: SolanaCluster = getSolanaCluster()): string[] {
  const urls: string[] = []
  const fromEnv =
    process.env.SOLANA_RPC_URL?.trim() || process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim()
  if (fromEnv) urls.push(fromEnv)

  const fallbacks =
    cluster === 'devnet' ? DEVNET_PUBLIC_FALLBACKS : MAINNET_PUBLIC_FALLBACKS
  const defaultRpc = defaultSolanaRpcForCluster(cluster)

  for (const url of [defaultRpc, ...fallbacks]) {
    if (url && !urls.includes(url)) urls.push(url)
  }

  return urls
}

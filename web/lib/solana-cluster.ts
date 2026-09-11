export type SolanaCluster = 'mainnet-beta' | 'devnet'

const DEVNET_RPC = 'https://api.devnet.solana.com'
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com'

/** Active Solana cluster — use devnet for free testing. */
export function getSolanaCluster(): SolanaCluster {
  const raw =
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase() ||
    process.env.SOLANA_CLUSTER?.trim().toLowerCase() ||
    'mainnet-beta'
  return raw === 'devnet' ? 'devnet' : 'mainnet-beta'
}

export function isSolanaDevnet(): boolean {
  return getSolanaCluster() === 'devnet'
}

export function defaultSolanaRpcForCluster(cluster: SolanaCluster = getSolanaCluster()): string {
  return cluster === 'devnet' ? DEVNET_RPC : MAINNET_RPC
}

/** Raydium CPMM pool creation is mainnet-only; devnet tests mint + program flow only. */
export function solanaRaydiumEnabled(): boolean {
  if (isSolanaDevnet()) return false
  return process.env.NEXT_PUBLIC_SOLANA_SKIP_RAYDIUM !== 'true'
}

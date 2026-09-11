import type { LaunchChainConfig } from '@/lib/launch-chains/registry'
import { createSolanaConnection } from '@/lib/solana-rpc'
import { deriveFactoryPda } from '@/lib/solana-launch/factory-client'
import { PublicKey } from '@solana/web3.js'

export type SolanaLaunchPreflight = {
  ok: boolean
  chainKey: 'solana'
  programId: string | null
  rpcConfigured: boolean
  factoryInitialized: boolean
  issues: string[]
}

export async function preflightSolanaLaunchAsync(
  chain: LaunchChainConfig,
): Promise<SolanaLaunchPreflight> {
  const base = preflightSolanaLaunch(chain)
  if (!base.ok || !chain.programId) return { ...base, factoryInitialized: false }

  try {
    const connection = createSolanaConnection()
    const [factory] = deriveFactoryPda(new PublicKey(chain.programId))
    const info = await connection.getAccountInfo(factory)
    const factoryInitialized = Boolean(info?.data && info.data.length > 8)
    if (!factoryInitialized) {
      base.issues.push('Launch factory account is not initialized on Solana')
      base.ok = false
    }
    return { ...base, factoryInitialized }
  } catch {
    base.issues.push('Could not reach Solana RPC — check SOLANA_RPC_URL')
    base.ok = false
    return { ...base, factoryInitialized: false }
  }
}

export function preflightSolanaLaunch(chain: LaunchChainConfig): SolanaLaunchPreflight {
  const issues: string[] = []
  const programId = chain.programId
  const rpcConfigured = Boolean(
    process.env.SOLANA_RPC_URL?.trim() ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
      chain.programId,
  )

  if (!programId) {
    issues.push('Solana launch program is not configured (NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID)')
  }
  if (!rpcConfigured) {
    issues.push('Solana RPC is not configured (SOLANA_RPC_URL)')
  }
  if (!chain.deployEnabled) {
    issues.push('Solana fair launch deploy is not enabled yet')
  }

  return {
    ok: issues.length === 0,
    chainKey: 'solana',
    programId,
    rpcConfigured,
    factoryInitialized: false,
    issues,
  }
}

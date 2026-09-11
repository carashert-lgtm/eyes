import { createPublicClient, http, type Address } from 'viem'
import { LAUNCH_FACTORY_ABI } from '@/lib/contracts/launch-factory'
import { getLaunchEvmChain, getLaunchRpcUrls, type LaunchEvmChainKey } from '@/lib/viem-chain'

export type FactoryPreflight = {
  ok: boolean
  factory: Address
  launchesEnabled: boolean
  launcherWhitelistEnabled: boolean
  walletApproved: boolean
  liquiditySeeder: Address | null
  issues: string[]
}

async function readFactory(
  factory: Address,
  wallet: Address,
  chainKey: LaunchEvmChainKey,
): Promise<FactoryPreflight> {
  const issues: string[] = []
  let lastError: unknown
  const chain = getLaunchEvmChain(chainKey)

  for (const rpc of getLaunchRpcUrls(chainKey)) {
    try {
      const client = createPublicClient({ chain, transport: http(rpc) })
      const [launchesEnabled, launcherWhitelistEnabled, walletApproved, seeder] =
        await Promise.all([
          client.readContract({
            address: factory,
            abi: LAUNCH_FACTORY_ABI,
            functionName: 'launchesEnabled',
          }),
          client.readContract({
            address: factory,
            abi: LAUNCH_FACTORY_ABI,
            functionName: 'launcherWhitelistEnabled',
          }),
          client.readContract({
            address: factory,
            abi: LAUNCH_FACTORY_ABI,
            functionName: 'approvedLaunchers',
            args: [wallet],
          }),
          client.readContract({
            address: factory,
            abi: LAUNCH_FACTORY_ABI,
            functionName: 'liquiditySeeder',
          }),
        ])

      if (!launchesEnabled) issues.push('Launch factory is paused (launchesEnabled=false)')
      if (launcherWhitelistEnabled && !walletApproved) {
        issues.push('Your wallet is not on the launcher whitelist')
      }
      if (!seeder || seeder === '0x0000000000000000000000000000000000000000') {
        issues.push('Liquidity seeder is not configured on the factory')
      }

      return {
        ok: issues.length === 0,
        factory,
        launchesEnabled,
        launcherWhitelistEnabled,
        walletApproved,
        liquiditySeeder: seeder as Address,
        issues,
      }
    } catch (e) {
      lastError = e
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not read launch factory')
}

export async function preflightLaunchFactory(
  factory: Address,
  wallet: Address,
  chainKey: LaunchEvmChainKey = 'base',
): Promise<FactoryPreflight> {
  return readFactory(factory, wallet, chainKey)
}

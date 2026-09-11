/**
 * On-chain Ethereum launch factory smoke test (read-only, no gas spent).
 * Usage: node scripts/test-ethereum-launch.mjs
 */
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const FACTORY = process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim() ||
  '0xd58e5EA7D8da706fA89e7EeE22Bd236Cf0F33B89'
const RPC = process.env.ETHEREUM_MAINNET_RPC_URL?.trim() || 'https://ethereum.publicnode.com'
const TEST_WALLET = process.env.TEST_WALLET?.trim() || '0x2C8988415c9f2D2a8F9bAE2489e400e3a351d00f'

const ABI = [
  { type: 'function', name: 'launchesEnabled', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'launcherWhitelistEnabled', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'approvedLaunchers', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'liquiditySeeder', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'launchCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
]

async function main() {
  if (!isAddress(FACTORY)) throw new Error(`Invalid factory: ${FACTORY}`)
  const client = createPublicClient({ chain: mainnet, transport: http(RPC) })
  const [launchesEnabled, whitelist, approved, seeder, launchCount] = await Promise.all([
    client.readContract({ address: FACTORY, abi: ABI, functionName: 'launchesEnabled' }),
    client.readContract({ address: FACTORY, abi: ABI, functionName: 'launcherWhitelistEnabled' }),
    client.readContract({ address: FACTORY, abi: ABI, functionName: 'approvedLaunchers', args: [TEST_WALLET] }),
    client.readContract({ address: FACTORY, abi: ABI, functionName: 'liquiditySeeder' }),
    client.readContract({ address: FACTORY, abi: ABI, functionName: 'launchCount' }),
  ])

  const issues = []
  if (!launchesEnabled) issues.push('launchesEnabled=false')
  if (whitelist && !approved) issues.push('wallet not whitelisted')
  if (!seeder || seeder === '0x0000000000000000000000000000000000000000') issues.push('no liquidity seeder')

  console.log(JSON.stringify({
    ok: issues.length === 0,
    chain: 'ethereum',
    factory: FACTORY,
    rpc: RPC,
    launchesEnabled,
    launcherWhitelistEnabled: whitelist,
    walletApproved: approved,
    liquiditySeeder: seeder,
    launchCount: launchCount.toString(),
    issues,
  }, null, 2))

  process.exit(issues.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

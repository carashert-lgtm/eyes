/**
 * Ethereum launch readiness — run before go-live:
 *   NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM=0xd58e... npx tsx scripts/test-ethereum-launch-ready.mjs
 *   SITE_URL=https://www.eyesopen.to npx tsx scripts/test-ethereum-launch-ready.mjs
 */
import { getCreateLaunchGates } from '../lib/create-launch-gates.ts'
import { getLaunchChain } from '../lib/launch-chains/registry.ts'
import { preflightLaunchFactory } from '../lib/launch-factory-preflight.ts'

const FACTORY =
  process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim() ??
  '0xd58e5EA7D8da706fA89e7EeE22Bd236Cf0F33B89'
const WALLET =
  process.env.TEST_WALLET?.trim() ?? '0x2C8988415c9f2D2a8F9bAE2489e400e3a351d00f'
const SITE = process.env.SITE_URL?.trim() ?? 'https://www.eyesopen.to'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const eth = getLaunchChain('ethereum')
if (eth.comingSoon) fail('ethereum should not be comingSoon when factory env is set')
if (!eth.deployEnabled) fail('ethereum deployEnabled should be true')
if (eth.factoryAddress?.toLowerCase() !== FACTORY.toLowerCase()) {
  fail(`factory mismatch: ${eth.factoryAddress}`)
}
if (eth.defaultLpNative !== '0.05') fail(`expected default LP 0.05, got ${eth.defaultLpNative}`)

const readyGates = getCreateLaunchGates({
  chain: eth,
  signedIn: true,
  hasWallet: true,
  walletUnlocked: true,
  canSign: true,
  factoryReady: true,
  name: 'Test',
  symbol: 'TST',
  agreed: true,
  retentionEnabled: true,
  hasToken: true,
  eyesFeeCost: 21250,
  eyesBalance: 50000,
  nativeBalance: 0.06,
  lpNativeRequired: 0.05,
})
if (!readyGates.ready) fail(`gates should be ready: ${readyGates.blockingMessage}`)

const lowEth = getCreateLaunchGates({
  chain: eth,
  signedIn: true,
  hasWallet: true,
  walletUnlocked: true,
  canSign: true,
  factoryReady: true,
  name: 'Test',
  symbol: 'TST',
  agreed: true,
  retentionEnabled: true,
  hasToken: true,
  eyesFeeCost: 21250,
  eyesBalance: 50000,
  nativeBalance: 0.01,
  lpNativeRequired: 0.05,
})
if (lowEth.ready) fail('low ETH on ethereum should block deploy')

try {
  const preflight = await preflightLaunchFactory(FACTORY, WALLET, 'ethereum')
  if (!preflight.ok) fail(`on-chain preflight: ${preflight.issues.join(', ')}`)
} catch (e) {
  fail(`on-chain preflight threw: ${e instanceof Error ? e.message : e}`)
}

try {
  const preflightRes = await fetch(
    `${SITE}/api/launch/preflight?chain=ethereum&wallet=${encodeURIComponent(WALLET)}`,
  )
  const preflightJson = await preflightRes.json()
  if (!preflightRes.ok || !preflightJson.ok) {
    fail(`production preflight API: ${JSON.stringify(preflightJson)}`)
  }
} catch (e) {
  fail(`production preflight fetch: ${e instanceof Error ? e.message : e}`)
}

try {
  const balRes = await fetch(
    `${SITE}/api/wallet/balance?wallet=${encodeURIComponent(WALLET)}&chain=ethereum`,
  )
  const balJson = await balRes.json()
  if (!balRes.ok || typeof balJson.nativeBalance !== 'number') {
    fail(`production balance API: ${JSON.stringify(balJson)}`)
  }
} catch (e) {
  fail(`production balance fetch: ${e instanceof Error ? e.message : e}`)
}

if (failed === 0) {
  console.log('PASS ethereum launch ready', {
    factory: FACTORY,
    deployEnabled: eth.deployEnabled,
    gateCount: readyGates.gates.length,
  })
}

process.exit(failed)

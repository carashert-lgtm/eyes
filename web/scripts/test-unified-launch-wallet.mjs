/**
 * Unified Eyes wallet launch logic — run:
 *   npx tsx scripts/test-unified-launch-wallet.mjs
 */
import { getCreateLaunchGates } from '../lib/create-launch-gates.ts'
import { getLaunchChain } from '../lib/launch-chains/registry.ts'
import {
  deriveSolanaAddressFromEvmPrivateKey,
  isValidSolanaAddress,
} from '../lib/eyes-account/solana-address.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const TEST_PK = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

const sol1 = deriveSolanaAddressFromEvmPrivateKey(TEST_PK)
const sol2 = deriveSolanaAddressFromEvmPrivateKey(TEST_PK)
if (sol1 !== sol2) fail('Solana address derivation must be deterministic')
if (!isValidSolanaAddress(sol1)) fail(`derived solana address invalid: ${sol1}`)

const baseChain = getLaunchChain('base')
const ethChain = getLaunchChain('ethereum')
const solChain = getLaunchChain('solana')

const shared = {
  signedIn: true,
  hasWallet: true,
  walletUnlocked: true,
  canSign: true,
  name: 'Test',
  symbol: 'TST',
  agreed: true,
  retentionEnabled: true,
  hasToken: true,
  eyesFeeCost: 21250,
  eyesBalance: 25000,
  launchFeeSatisfied: false,
  solanaAddressReady: true,
}

const baseGates = getCreateLaunchGates({
  ...shared,
  chain: baseChain,
  factoryReady: true,
  nativeBalance: 0.05,
  lpNativeRequired: 0.01,
})
if (!baseGates.gates.some((g) => g.id === 'eyes_balance' && g.ok)) {
  fail('base should pass eyes_balance gate')
}
if (!baseGates.gates.some((g) => g.id === 'native_balance')) {
  fail('base should include native_balance gate')
}

const ethGates = getCreateLaunchGates({
  ...shared,
  chain: ethChain,
  factoryReady: false,
  nativeBalance: 0.2,
  lpNativeRequired: 0,
})
const ethNative = ethGates.gates.find((g) => g.id === 'native_balance')
if (!ethNative) fail('ethereum should show native ETH gate while deploy is coming soon')
if (!ethNative.ok) fail('ethereum native gate should pass with 0.2 ETH')
if (ethGates.ready) fail('ethereum should block on factory until live')

const solGates = getCreateLaunchGates({
  ...shared,
  chain: solChain,
  factoryReady: false,
  nativeBalance: 1,
  lpNativeRequired: 0,
})
const solNative = solGates.gates.find((g) => g.id === 'native_balance')
if (!solNative) {
  fail('solana should show native SOL gate while deploy is coming soon (same as ethereum)')
}
if (!solNative.ok) fail('solana native gate should pass with 1 SOL')
if (solGates.ready) fail('solana should block on program until live')

const solLocked = getCreateLaunchGates({
  ...shared,
  chain: solChain,
  factoryReady: false,
  nativeBalance: 1,
  solanaAddressReady: false,
})
const programGate = solLocked.gates.find((g) => g.id === 'program')
if (programGate?.ok) fail('solana program gate should fail when address not ready')

const lowEyesEth = getCreateLaunchGates({
  ...shared,
  chain: ethChain,
  factoryReady: false,
  eyesBalance: 100,
  nativeBalance: 1,
})
const eyesGate = lowEyesEth.gates.find((g) => g.id === 'eyes_balance')
if (eyesGate?.ok) fail('low $EYES should block on all networks')
if (!/Base/i.test(eyesGate?.hint ?? '')) {
  fail(`eyes hint should mention Base on ethereum: ${eyesGate?.hint}`)
}

console.log('PASS unified launch wallet logic', {
  solanaAddress: sol1.slice(0, 8) + '…',
  baseGateCount: baseGates.gates.length,
  ethNativeLabel: ethNative?.label,
  solNativeLabel: solNative?.label,
})

process.exit(failed)

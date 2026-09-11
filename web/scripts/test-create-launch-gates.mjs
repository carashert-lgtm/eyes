/**
 * Create Launch deploy gate logic — run before deploy:
 *   npx tsx scripts/test-create-launch-gates.mjs
 */
import { getCreateLaunchGates } from '../lib/create-launch-gates.ts'
import { getLaunchChain } from '../lib/launch-chains/registry.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const baseChain = getLaunchChain('base')
const solChain = getLaunchChain('solana')

const base = {
  chain: baseChain,
  signedIn: true,
  hasWallet: true,
  walletUnlocked: true,
  canSign: true,
  factoryReady: true,
  name: 'Fair Token',
  symbol: 'FAIR',
  agreed: true,
  retentionEnabled: true,
  hasToken: true,
  eyesFeeCost: 21250,
  eyesBalance: 25000,
  nativeBalance: 0.05,
  lpNativeRequired: 0.01,
}

const ready = getCreateLaunchGates(base)
if (!ready.ready) fail('expected all gates ready for full input')

const lowEyes = getCreateLaunchGates({ ...base, eyesBalance: 1000 })
if (lowEyes.ready) fail('insufficient $EYES should block deploy')
if (!/Base/i.test(lowEyes.blockingMessage ?? '')) {
  fail(`low eyes hint should mention Base: ${lowEyes.blockingMessage}`)
}

const ethLaunch = getCreateLaunchGates({
  ...base,
  chain: getLaunchChain('ethereum'),
  factoryReady: false,
  nativeBalance: 0.2,
})
if (ethLaunch.ready) fail('ethereum without factory should block deploy')

const solPendingInput = {
  chain: solChain,
  signedIn: true,
  hasWallet: true,
  walletUnlocked: true,
  canSign: true,
  factoryReady: false,
  name: 'Sol Token',
  symbol: 'SOL',
  agreed: true,
  retentionEnabled: true,
  hasToken: true,
  eyesFeeCost: 21250,
  eyesBalance: 25000,
  nativeBalance: 1,
  lpNativeRequired: 0.5,
  solanaAddressReady: true,
}
const solPending = getCreateLaunchGates(solPendingInput)
if (solPending.ready) fail('solana without program should block deploy')
if (!/21,250/.test(solPending.gates.find((g) => g.id === 'eyes_balance')?.label ?? '')) {
  fail('solana should still require $EYES on Base')
}

const solNativeWhilePending = getCreateLaunchGates({
  ...solPendingInput,
  nativeBalance: 0.2,
  lpNativeRequired: 0,
})
if (!solNativeWhilePending.gates.some((g) => g.id === 'native_balance')) {
  fail('solana should show SOL gate before program is live')
}

console.log('PASS create launch gates logic', {
  gateCount: ready.gates.length,
  ethHint: ethLaunch.blockingMessage,
  solanaEyesGate: solPending.gates.find((g) => g.id === 'eyes_balance')?.label,
})

process.exit(failed)

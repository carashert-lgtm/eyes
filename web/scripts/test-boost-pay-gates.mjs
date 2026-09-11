/**
 * Boost pay gate logic — run:
 *   npx tsx scripts/test-boost-pay-gates.mjs
 */
import {
  getBoostPayGates,
  hasEnoughEyesBalance,
} from '../lib/boost-pay-gates.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const pulseScout = 2500

const readyBase = {
  balance: pulseScout,
  ethBalance: 0.01,
  eyesCost: pulseScout,
  balanceReady: true,
  isError: false,
  hasWallet: true,
  isConnected: true,
  hasToken: true,
}

if (!hasEnoughEyesBalance(pulseScout, pulseScout)) fail('exact balance should pass')
if (hasEnoughEyesBalance(pulseScout - 0.0001, pulseScout)) fail('slightly under should fail')
if (!hasEnoughEyesBalance(pulseScout + 100, pulseScout)) fail('over balance should pass')

const ready = getBoostPayGates(readyBase)
if (!ready.canPay) fail('sufficient balance should allow pay')
if (ready.showInsufficientEyes) fail('sufficient balance must not show insufficient')
if (ready.blockReason) fail(`expected no block reason when ready: ${ready.blockReason}`)

const exact = getBoostPayGates({ ...readyBase, balance: pulseScout, eyesCost: pulseScout })
if (!exact.canPay || exact.showInsufficientEyes) {
  fail('exact-match balance should pay without insufficient warning')
}

const low = getBoostPayGates({ ...readyBase, balance: pulseScout - 1 })
if (low.canPay) fail('under balance should block pay')
if (!low.showInsufficientEyes) fail('under balance should show insufficient')
if (!/insufficient/i.test(low.blockReason ?? '')) {
  fail(`block reason should mention insufficient: ${low.blockReason}`)
}

const loading = getBoostPayGates({ ...readyBase, balance: 0, balanceReady: false })
if (loading.canPay) fail('loading balance should block pay')
if (loading.showInsufficientEyes) fail('loading must not show insufficient while balance unknown')

const enoughEyesNoGas = getBoostPayGates({ ...readyBase, ethBalance: 0 })
if (enoughEyesNoGas.canPay) fail('no ETH gas should block pay')
if (enoughEyesNoGas.showInsufficientEyes) {
  fail('enough $EYES with no gas should not show insufficient $EYES')
}

const builderDiscount = getBoostPayGates({
  ...readyBase,
  balance: 2400,
  eyesCost: 2375,
})
if (!builderDiscount.canPay || builderDiscount.showInsufficientEyes) {
  fail('discounted cost within balance should pay without insufficient warning')
}

console.log('PASS boost pay gates logic', {
  readyCanPay: ready.canPay,
  lowBlock: low.blockReason,
  loadingBlock: loading.blockReason,
})

process.exit(failed)

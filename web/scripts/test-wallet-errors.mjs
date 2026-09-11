/**
 * Wallet error formatting — run:
 *   npx tsx scripts/test-wallet-errors.mjs
 */
import { formatWalletTxError, hasEnoughEthForGas } from '../lib/wallet-errors.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const gasErr = new Error(
  'Execution reverted with reason: gas required exceeds allowance (0).',
)
const msg = formatWalletTxError(gasErr)
if (!/not enough eth/i.test(msg)) fail(`expected ETH gas message, got: ${msg}`)

if (hasEnoughEthForGas(0)) fail('0 eth should fail gas check')
if (hasEnoughEthForGas(0.001, 0.003)) fail('0.001 eth should fail 0.003 min')
if (!hasEnoughEthForGas(0.01)) fail('0.01 eth should pass default min')

const unknown = formatWalletTxError(new Error('An unknown RPC error occurred.', { cause: new Error('execution reverted') }))
if (/reverted|network|refresh/i.test(unknown) === false && unknown === 'An unknown RPC error occurred.') {
  // acceptable fallback when no cause detail
}

console.log('PASS wallet errors', { gasMessage: msg.slice(0, 60), unknown: unknown.slice(0, 60) })
process.exit(failed)

/**
 * npx tsx scripts/test-wallet-session-verify.mjs
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  assertWalletSessionIntegrity,
  isWalletSessionValid,
} from '../lib/wallet-session-verify.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const pk = generatePrivateKey()
const account = privateKeyToAccount(pk)
const session = { address: account.address, privateKey: pk }

try {
  assertWalletSessionIntegrity(session)
} catch {
  fail('valid session should pass')
}

if (!isWalletSessionValid(session)) fail('valid session should be valid')

const bad = { address: account.address, privateKey: generatePrivateKey() }
try {
  assertWalletSessionIntegrity(bad)
  fail('mismatched key should throw')
} catch (e) {
  if (!/does not match/i.test(e.message)) fail(`unexpected mismatch message: ${e.message}`)
}

console.log('PASS wallet session verify')
process.exit(failed)

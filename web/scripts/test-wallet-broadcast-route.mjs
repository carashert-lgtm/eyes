/**
 * Broadcast route validation — run:
 *   npx tsx scripts/test-wallet-broadcast-route.mjs
 */
const SIGNED_TX_RE = /^0x[0-9a-fA-F]+$/

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

if (SIGNED_TX_RE.test('0x02abc')) {
  // ok
} else {
  fail('valid hex should pass')
}

if (!SIGNED_TX_RE.test('0xzz')) fail('invalid hex should fail')
if (!SIGNED_TX_RE.test('abc')) fail('missing 0x should fail')
if (!SIGNED_TX_RE.test('0x')) fail('empty payload should fail')

console.log('PASS wallet broadcast route validation')
process.exit(failed)

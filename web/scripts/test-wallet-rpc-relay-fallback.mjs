/**
 * npx tsx scripts/test-wallet-rpc-relay-fallback.mjs
 */
import { relayWalletRpc } from '../lib/wallet-rpc-relay.ts'
import { sanitizeRpcError } from '../lib/wallet-errors.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const sanitized = sanitizeRpcError(
  'URL: https://base-mainnet.g.alchemy.com/v2/alch_secret123 Details: BASE_MAINNET is not enabled',
)
if (/alch_secret123/.test(sanitized)) fail('should redact alchemy key')
if (!/base_mainnet is not enabled/i.test(sanitized)) fail('should keep useful message')

const chain = await relayWalletRpc('eth_chainId', [])
if (!chain.ok) fail(`eth_chainId should work: ${chain.error}`)

console.log('PASS wallet rpc relay fallback', { chainId: chain.result, sanitized })
process.exit(failed)

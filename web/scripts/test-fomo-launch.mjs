/**
 * FOMO launch flow — run before deploy:
 *   npx tsx scripts/test-fomo-launch.mjs
 */
import { getFomoTokenUrl, getDexScreenerUrl } from '../lib/fomo-links.ts'
import { DEFAULT_LP_TOKEN_AMOUNT, defaultLpEth } from '../lib/launch-constants.ts'
import { LAUNCH_FACTORY_ABI } from '../lib/contracts/launch-factory.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const token = '0xAbCdEf1234567890123456789012345678901234'
const fomo = getFomoTokenUrl(token)
if (!fomo.includes('fomo.family/tokens/base/')) fail(`bad fomo url: ${fomo}`)
if (!fomo.includes(token.toLowerCase())) fail('fomo url missing token address')

const dex = getDexScreenerUrl(token)
if (!dex.includes('dexscreener.com/base/')) fail(`bad dex url: ${dex}`)

if (DEFAULT_LP_TOKEN_AMOUNT !== BigInt(500_000_000) * BigInt(10 ** 18)) {
  fail('DEFAULT_LP_TOKEN_AMOUNT should be 500M tokens')
}

const lpEth = defaultLpEth()
if (!lpEth || Number(lpEth) <= 0) fail(`invalid default lp eth: ${lpEth}`)

const hasSeed = LAUNCH_FACTORY_ABI.some((x) => x.type === 'function' && x.name === 'seedLiquidity')
if (!hasSeed) fail('LAUNCH_FACTORY_ABI missing seedLiquidity')

console.log('PASS fomo launch logic', {
  fomoUrl: fomo,
  defaultLpEth: lpEth,
  lpTokenWei: DEFAULT_LP_TOKEN_AMOUNT.toString(),
})

process.exit(failed)

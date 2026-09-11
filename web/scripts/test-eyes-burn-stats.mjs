/**
 * Eyes burn stats logic — run: npx tsx scripts/test-eyes-burn-stats.mjs
 */
import { fetchEyesBurnStats } from '../lib/eyes-burn-stats.ts'

const stats = await fetchEyesBurnStats()
if (!stats) {
  console.error('FAIL: could not load burn stats (token/RPC)')
  process.exit(1)
}
if (!Number.isFinite(stats.totalRemoved) || stats.totalRemoved < 0) {
  console.error('FAIL: invalid totalRemoved', stats)
  process.exit(1)
}
console.log('PASS eyes burn stats', {
  totalRemoved: stats.totalRemoved,
  dead: stats.sentToDeadAddress,
  supplyBurned: stats.burnedViaSupplyReduction,
})

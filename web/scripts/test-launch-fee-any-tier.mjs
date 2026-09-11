/**
 * npx tsx scripts/test-launch-fee-any-tier.mjs [burnHash] [treasuryHash]
 */
process.env.NEXT_PUBLIC_APP_ENV = 'production'
process.env.NEXT_PUBLIC_CHAIN_ID = '8453'
process.env.NEXT_PUBLIC_USE_ANVIL = 'false'
process.env.NODE_ENV = 'production'

const wallet = '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6'
const burnHash =
  process.argv[2] ?? '0x41c37b9fc4fe076b11fedf694cfa4af791fdd2850421e42678c5df64084dbf72'
const treasuryHash = process.argv[3] ?? '0x5396376627e60b4a32ed9befa9573add827a3e9d1587ef186f7db8b633790772'

const { verifyLaunchFeeAnyTier, findRecentLaunchFeePair } = await import(
  '../lib/launch-fee-onchain.ts'
)

console.log('--- verifyLaunchFeeAnyTier ---')
const matched = await verifyLaunchFeeAnyTier(burnHash, treasuryHash, wallet)
console.log('PASS tier', matched.tierId, matched.pricing)

console.log('--- findRecentLaunchFeePair ---')
const recent = await findRecentLaunchFeePair(wallet)
console.log(recent ? `FOUND burn ${recent.burnTxHash} tier ${recent.tierId}` : 'NONE')

/**
 * npx tsx scripts/test-retention-verify.mjs [burnHash] [treasuryHash]
 */
process.env.NEXT_PUBLIC_APP_ENV = 'production'
process.env.NEXT_PUBLIC_CHAIN_ID = '8453'
process.env.NEXT_PUBLIC_USE_ANVIL = 'false'
process.env.NODE_ENV = 'production'

const { verifyLaunchFeeSettlement } = await import('../lib/retention-verify.ts')
const { computeLaunchFeeEyes } = await import('../lib/retention-config.ts')
const { getAcceptedTreasuryAddresses } = await import('../lib/settlement-treasury.ts')

const wallet = '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6'
const burnHash =
  process.argv[2] ?? '0x2011452b5541a4eace89a6545f05f598035bbb5791d200d1fea63031bcf0944d'
const treasuryHash = process.argv[3]

const pricing = computeLaunchFeeEyes('builder')
console.log('pricing', pricing)
console.log('accepted treasury', getAcceptedTreasuryAddresses())

try {
  const result = await verifyLaunchFeeSettlement(
    burnHash,
    treasuryHash,
    wallet,
    pricing.burnAmount,
    pricing.treasuryAmount,
  )
  console.log('PASS burn', result.burn.amountFormatted, 'treasury', result.treasury?.amountFormatted)
} catch (e) {
  console.error('FAIL', e.message)
  process.exit(1)
}

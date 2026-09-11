/**
 * npx tsx scripts/test-eyes-token-config.mjs
 */
process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
process.env.NEXT_PUBLIC_APP_ENV = 'production'
process.env.NEXT_PUBLIC_CHAIN_ID = '8453'
process.env.NEXT_PUBLIC_USE_ANVIL = 'false'
process.env.NODE_ENV = 'production'

const { getEyesTokenAddress, BASE_MAINNET_EYES_TOKEN } = await import('../lib/eyes-token-config.ts')

const addr = getEyesTokenAddress()
if (addr.toLowerCase() !== BASE_MAINNET_EYES_TOKEN.toLowerCase()) {
  console.error('FAIL: production should use mainnet token, got', addr)
  process.exit(1)
}
console.log('PASS eyes token config', addr)

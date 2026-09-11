/**
 * Launch chain registry — run:
 *   npx tsx scripts/test-launch-chains.mjs
 */
import {
  getDefaultLaunchChain,
  getEnabledLaunchChains,
  getLaunchChain,
  isValidLaunchWallet,
} from '../lib/launch-chains/registry.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

const enabled = getEnabledLaunchChains()
if (enabled.length < 1) fail('expected at least one enabled launch chain')

const base = getLaunchChain('base')
if (base.family !== 'evm') fail('base should be evm')
if (!base.enabled) fail('base should be enabled in production config')

const sol = getLaunchChain('solana')
if (sol.family !== 'solana') fail('solana should be solana family')
if (!isValidLaunchWallet(sol, '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')) {
  fail('valid solana address should pass')
}
if (isValidLaunchWallet(sol, '0xnotsolana')) fail('evm address should fail on solana')

const eth = getLaunchChain('ethereum')
if (eth.comingSoon && eth.deployEnabled) fail('ethereum should not be deploy enabled when coming soon')
if (process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim()) {
  if (!eth.deployEnabled) fail('ethereum should be deploy enabled when factory env is set')
  if (eth.comingSoon) fail('ethereum should not be coming soon when factory env is set')
}

const def = getDefaultLaunchChain()
if (def.key !== 'base') fail(`default launch chain should be base, got ${def.key}`)

console.log('PASS launch chains', {
  enabled: enabled.map((c) => c.key),
  baseDeploy: base.deployEnabled,
  solanaDeploy: sol.deployEnabled,
  ethereumComingSoon: eth.comingSoon,
})

process.exit(failed)

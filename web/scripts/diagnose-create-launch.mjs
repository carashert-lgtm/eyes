/**
 * Full Create Launch diagnostic — factory, wallet, fee verify, simulate.
 * npx tsx scripts/diagnose-create-launch.mjs [wallet]
 */
import { createPublicClient, formatEther, formatUnits, getAddress, http, parseEther } from 'viem'
import { base } from 'viem/chains'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const WALLET = getAddress(
  process.argv[2] ?? '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6',
)

const __dir = dirname(fileURLToPath(import.meta.url))
const deploy = JSON.parse(
  readFileSync(join(__dir, '../../deployments/base-mainnet.json'), 'utf8'),
)

const RPCS = [
  process.env.BASE_MAINNET_RPC_URL,
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://1rpc.io/base',
].filter(Boolean)

const factory = getAddress(deploy.factory)
const eyes = getAddress(deploy.eyesToken)
const feeCollector = getAddress(deploy.feeCollector)
const dead = getAddress('0x000000000000000000000000000000000000dEaD')

const factoryAbi = [
  { name: 'launchesEnabled', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'launcherWhitelistEnabled', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'approvedLaunchers', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'liquiditySeeder', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'launchCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'createLaunch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{
      name: 'config', type: 'tuple', components: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'tokenSupply', type: 'uint256' },
        { name: 'eyesWindowDuration', type: 'uint64' },
        { name: 'creatorFeeBps', type: 'uint16' },
        { name: 'burnFeeBps', type: 'uint16' },
      ],
    }],
    outputs: [{ type: 'address' }, { type: 'uint256' }],
  },
]

const erc20Abi = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
]

async function client() {
  for (const rpc of RPCS) {
    try {
      const c = createPublicClient({ chain: base, transport: http(rpc) })
      await c.getBlockNumber()
      console.log('RPC:', rpc.replace(/\/v2\/[^/]+/, '/v2/***'))
      return c
    } catch {
      continue
    }
  }
  throw new Error('No RPC available')
}

async function readWithFallback(fn) {
  let lastError
  for (const rpc of RPCS) {
    try {
      const c = createPublicClient({ chain: base, transport: http(rpc) })
      return await fn(c)
    } catch (e) {
      lastError = e
      continue
    }
  }
  throw lastError ?? new Error('All RPCs failed')
}

const c = await client()

const ethBal = await readWithFallback((client) => client.getBalance({ address: WALLET }))
const eyesBal = await readWithFallback((client) =>
  client.readContract({ address: eyes, abi: erc20Abi, functionName: 'balanceOf', args: [WALLET] }),
)
const launchesEnabled = await readWithFallback((client) =>
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'launchesEnabled' }),
)
const whitelistEnabled = await readWithFallback((client) =>
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'launcherWhitelistEnabled' }),
)
const approved = await readWithFallback((client) =>
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'approvedLaunchers', args: [WALLET] }),
)
const seeder = await readWithFallback((client) =>
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'liquiditySeeder' }),
)
const count = await readWithFallback((client) =>
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'launchCount' }),
)

console.log('\n=== Wallet ===')
console.log('address:', WALLET)
console.log('ETH:', formatEther(ethBal))
console.log('EYES:', formatUnits(eyesBal, 18))

console.log('\n=== Factory', factory, '===')
console.log('launchesEnabled:', launchesEnabled)
console.log('launcherWhitelistEnabled:', whitelistEnabled)
console.log('wallet approved:', approved)
console.log('liquiditySeeder:', seeder)
console.log('launchCount:', count.toString())

const blockers = []
if (!launchesEnabled) blockers.push('launchesEnabled=false')
if (whitelistEnabled && !approved) blockers.push('wallet not on launcher whitelist')

console.log('\n=== Simulate createLaunch ===')
try {
  await c.simulateContract({
    address: factory,
    abi: factoryAbi,
    functionName: 'createLaunch',
    args: [{
      name: 'DiagTest',
      symbol: 'DIAG',
      creator: WALLET,
      tokenSupply: 0n,
      eyesWindowDuration: 3600n,
      creatorFeeBps: 0,
      burnFeeBps: 0,
    }],
    account: WALLET,
  })
  console.log('SIMULATE createLaunch: PASS')
} catch (e) {
  console.log('SIMULATE createLaunch: FAIL —', e.shortMessage ?? e.message)
  blockers.push('createLaunch simulation failed')
}

process.env.NEXT_PUBLIC_APP_ENV = 'production'
process.env.NEXT_PUBLIC_CHAIN_ID = '8453'
process.env.NODE_ENV = 'production'
const { computeLaunchFeeEyes } = await import('../lib/retention-config.ts')
const { findTreasuryTxAfterBurn } = await import('../lib/retention-verify.ts')

const fee = computeLaunchFeeEyes('scout')
console.log('\n=== Launch fee (scout tier) ===')
console.log(fee)

if (Number(eyesBal) / 1e18 < fee.eyesCost) {
  blockers.push(`insufficient EYES (need ${fee.eyesCost})`)
}
if (Number(ethBal) / 1e18 < 0.013) {
  blockers.push('insufficient ETH (need ~0.013 for gas+0.01 LP)')
}

console.log('\n=== Recent fee txs (scan last 20k blocks) ===')
const latest = await c.getBlockNumber()
const fromBlock = latest - 20000n
const transferEvent = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
}

let burns = []
let treasuries = []
for (let start = fromBlock; start <= latest; start += 2000n) {
  const end = start + 1999n > latest ? latest : start + 1999n
  try {
    const logs = await c.getLogs({
      address: eyes,
      event: transferEvent,
      args: { from: WALLET },
      fromBlock: start,
      toBlock: end,
    })
    for (const log of logs) {
      const to = getAddress(log.args.to)
      const amt = Number(formatUnits(log.args.value, 18))
      if (to.toLowerCase() === dead.toLowerCase()) burns.push({ hash: log.transactionHash, amt })
      if (to.toLowerCase() === feeCollector.toLowerCase()) treasuries.push({ hash: log.transactionHash, amt })
    }
  } catch (e) {
    console.warn('getLogs chunk failed:', e.message?.slice(0, 60))
  }
}

console.log('burns:', burns.slice(-5))
console.log('treasuries:', treasuries.slice(-5))

if (burns.length && treasuries.length) {
  const lastBurn = burns[burns.length - 1]
  const found = await findTreasuryTxAfterBurn(lastBurn.hash, WALLET, fee.treasuryAmount)
  console.log('auto-find treasury for last burn:', found)
}

console.log('\n=== BLOCKERS ===')
if (blockers.length) {
  console.log(blockers.map((b) => ' · ' + b).join('\n'))
  process.exit(1)
}
console.log('None — launch should be possible if app env is wired correctly')

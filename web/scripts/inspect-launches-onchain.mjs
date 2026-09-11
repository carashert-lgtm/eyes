import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const deploy = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../deployments/base-mainnet.json'), 'utf8'),
)
const factory = deploy.factory
const RPCS = ['https://mainnet.base.org', 'https://base.publicnode.com', 'https://base.drpc.org']

async function client() {
  for (const rpc of RPCS) {
    try {
      const c = createPublicClient({ chain: base, transport: http(rpc) })
      await c.getBlockNumber()
      console.log('RPC', rpc)
      return c
    } catch {
      continue
    }
  }
  throw new Error('no rpc')
}

const getLaunchAbi = [
  {
    name: 'launchCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getLaunch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'launchId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'pair', type: 'address' },
          { name: 'eyesWindowStart', type: 'uint64' },
          { name: 'eyesWindowEnd', type: 'uint64' },
          { name: 'phase', type: 'uint8' },
          { name: 'liquidityLocked', type: 'bool' },
        ],
      },
    ],
  },
]

const c = await client()
const count = await c.readContract({
  address: factory,
  abi: getLaunchAbi,
  functionName: 'launchCount',
})
console.log('factory', factory)
console.log('launchCount', count.toString())

const phases = ['Pending', 'EyesWindow', 'Trading']
const now = Math.floor(Date.now() / 1000)

for (let id = 1n; id <= count; id++) {
  const info = await c.readContract({
    address: factory,
    abi: getLaunchAbi,
    functionName: 'getLaunch',
    args: [id],
  })
  console.log('\n--- launch', id.toString(), '---')
  console.log('token', info.token)
  console.log('creator', info.creator)
  console.log('pair', info.pair)
  console.log('phase', info.phase, phases[Number(info.phase)] ?? '?')
  console.log('eyesWindowStart', new Date(Number(info.eyesWindowStart) * 1000).toISOString())
  console.log('eyesWindowEnd', new Date(Number(info.eyesWindowEnd) * 1000).toISOString())
  console.log('secondsUntilWindowEnd', Number(info.eyesWindowEnd) - now)
  console.log('liquidityLocked', info.liquidityLocked)

  if (info.token !== '0x0000000000000000000000000000000000000000') {
    const code = await c.getBytecode({ address: info.token })
    console.log('tokenHasCode', Boolean(code && code.length > 2))
    try {
      const erc20 = [
        {
          name: 'name',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ type: 'string' }],
        },
        {
          name: 'symbol',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ type: 'string' }],
        },
      ]
      const name = await c.readContract({ address: info.token, abi: erc20, functionName: 'name' })
      const symbol = await c.readContract({ address: info.token, abi: erc20, functionName: 'symbol' })
      console.log('name/symbol', name, symbol)
    } catch (e) {
      console.log('meta err', e.shortMessage ?? e.message)
    }
  }
}

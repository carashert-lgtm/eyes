#!/usr/bin/env node
/**
 * Sync on-chain launches into web/data/launches-snapshot.json
 * Usage (from repo root):
 *   node ops/indexer/sync_launches.mjs
 * Or trigger remote sync:
 *   SITE=https://www.eyesopen.to SECRET=... node ops/indexer/sync_launches.mjs --remote
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  parseAbiItem,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const remote = process.argv.includes('--remote')

async function remoteSync() {
  const site = process.env.SITE ?? 'https://www.eyesopen.to'
  const secret = process.env.PLATFORM_API_SECRET ?? process.env.SECRET
  if (!secret) throw new Error('Set PLATFORM_API_SECRET or SECRET for remote sync')
  const res = await fetch(`${site}/api/retention/indexer/sync`, {
    method: 'POST',
    headers: { 'x-platform-secret': secret },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Remote sync failed')
  console.log(JSON.stringify(data, null, 2))
}

function loadDeployment() {
  const candidates = [
    path.join(ROOT, 'deployments/base-mainnet.json'),
    path.join(ROOT, 'deployments/base-sepolia.json'),
    path.join(ROOT, 'deployments/anvil.json'),
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const dep = JSON.parse(readFileSync(file, 'utf-8'))
    if (dep.factory) return dep
  }
  return null
}

function getClient(chainId) {
  if (chainId === 31337) {
    const rpc = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'
    const anvil = defineChain({
      id: 31337,
      name: 'Anvil',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [rpc] } },
    })
    return createPublicClient({ chain: anvil, transport: http(rpc) })
  }
  if (chainId === 8453) {
    const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
    return createPublicClient({ chain: base, transport: http(rpc) })
  }
  const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
  return createPublicClient({ chain: baseSepolia, transport: http(rpc) })
}

const factoryAbi = [
  {
    type: 'function',
    name: 'launchCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getLaunch',
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

async function localSync() {
  const dep = loadDeployment()
  if (!dep?.factory) {
    console.error('No factory in deployments/*.json — deploy contracts first.')
    process.exit(1)
  }

  const client = getClient(dep.chainId ?? 84532)
  const factory = getAddress(dep.factory)
  const count = Number(
    await client.readContract({ address: factory, abi: factoryAbi, functionName: 'launchCount' }),
  )

  const phases = ['Pending', 'EyesWindow', 'Trading']
  const launches = []

  for (let id = 1; id <= count; id++) {
    const info = await client.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: 'getLaunch',
      args: [BigInt(id)],
    })
    if (info[0] === '0x0000000000000000000000000000000000000000') continue
    launches.push({
      id: `launch-${id}`,
      launchId: id,
      name: `Launch #${id}`,
      symbol: `L${id}`,
      creator: info[1],
      tokenAddress: info[0],
      pairAddress: info[2] === '0x0000000000000000000000000000000000000000' ? undefined : info[2],
      phase: phases[Number(info[5])] ?? 'Pending',
      eyesWindowStart: new Date(Number(info[3]) * 1000).toISOString(),
      eyesWindowEnd: new Date(Number(info[4]) * 1000).toISOString(),
      lpLocked: info[6],
      volumeUsd24h: 0,
      trades24h: 0,
      feesEth24h: 0,
      eyesBurnedTotal: 0,
      boost: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  const snapshot = {
    updatedAt: new Date().toISOString(),
    source: 'indexer',
    launches,
  }

  const out = path.join(ROOT, 'web/data/launches-snapshot.json')
  const { writeFile, mkdir } = await import('node:fs/promises')
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify(snapshot, null, 2), 'utf-8')
  console.log(`Wrote ${launches.length} launches → ${out}`)
}

if (remote) {
  remoteSync().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
} else {
  localSync().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}

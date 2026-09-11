import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'

const TREASURY = '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'.toLowerCase()
const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
const client = createPublicClient({ chain: base, transport: http(rpc, { batch: { wait: 50 } }) })

// Blockscout: block_number_balance_updated_at = 50146593
const center = BigInt(50146593)
const radius = BigInt(5000)
const start = center - radius
const end = center + radius
const hits = []

console.error(`Scanning blocks ${start}..${end} around balance update`)

for (let n = start; n <= end; n++) {
  if ((n - start) % BigInt(500) === BigInt(0)) console.error('block', n.toString())
  try {
    const block = await client.getBlock({ blockNumber: n, includeTransactions: true })
    for (const tx of block.transactions) {
      if (typeof tx === 'string') continue
      if (tx.to?.toLowerCase() !== TREASURY) continue
      if (tx.value <= BigInt(0)) continue
      hits.push({
        hash: tx.hash,
        from: tx.from,
        value: formatEther(tx.value),
        block: n.toString(),
        ts: new Date(Number(block.timestamp) * 1000).toISOString(),
        kind: 'normal',
      })
    }
  } catch (e) {
    console.error('err block', n, e.message?.slice(0, 80))
    await new Promise((r) => setTimeout(r, 1000))
  }
}

console.log(JSON.stringify(hits, null, 2))

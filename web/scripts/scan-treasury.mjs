import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'

const TREASURY = '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'.toLowerCase()
const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
const client = createPublicClient({ chain: base, transport: http(rpc) })

const latest = await client.getBlockNumber()
console.log('latest block', latest.toString())
const balance = await client.getBalance({ address: TREASURY })
console.log('treasury balance', formatEther(balance), 'ETH')

// Scan last 500k blocks (~2 weeks on Base) for incoming ETH
const SCAN = BigInt(500_000)
const start = latest > SCAN ? latest - SCAN : BigInt(0)
const hits = []

for (let n = start; n <= latest; n++) {
  if ((n - start) % BigInt(50_000) === BigInt(0)) {
    console.error('scanning block', n.toString())
  }
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
    })
  }
}

console.log(JSON.stringify(hits, null, 2))

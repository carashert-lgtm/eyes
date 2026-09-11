const TREASURY = '0x3dff4adfa6d7482e3ffb362aa9d6370bcc45c4b5'
const BS = 'https://base.blockscout.com/api/v2'

import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })

async function scanBlock(n) {
  const block = await client.getBlock({ blockNumber: BigInt(n), includeTransactions: true })
  const hits = []
  for (const tx of block.transactions) {
    if (typeof tx === 'string') continue
    if (tx.to?.toLowerCase() === TREASURY && tx.value > 0n) {
      hits.push({ kind: 'normal', hash: tx.hash, from: tx.from, value: formatEther(tx.value), block: n })
    }
    const res = await fetch(`${BS}/transactions/${tx.hash}/internal-transactions`, { headers: { accept: 'application/json' } })
    if (!res.ok) continue
    const data = await res.json()
    for (const it of data.items ?? []) {
      const from = it.from?.hash?.toLowerCase()
      const to = it.to?.hash?.toLowerCase()
      const val = it.value ? BigInt(it.value) : 0n
      if (to === TREASURY && val > 0n) {
        hits.push({ kind: 'internal', hash: it.transaction_hash, from, value: formatEther(val), block: n, parent: tx.hash })
      }
    }
  }
  return hits
}

// Scan blocks around balance update and also recent blocks (last 50k in steps)
const center = 50146593
let all = []
for (const n of [center - 1, center, center + 1, center + 2, 50147314, 50147113]) {
  console.error('scanning', n)
  all.push(...(await scanBlock(n)))
}
console.log(JSON.stringify(all, null, 2))

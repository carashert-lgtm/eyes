import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'

const TREASURY = '0x3dff4adfa6d7482e3ffb362aa9d6370bcc45c4b5'
const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })
const block = await client.getBlock({ blockNumber: 50146593n, includeTransactions: true })
console.log('block ts', new Date(Number(block.timestamp) * 1000).toISOString())
console.log('tx count', block.transactions.length)
for (const tx of block.transactions) {
  if (typeof tx === 'string') continue
  const toTreasury = tx.to?.toLowerCase() === TREASURY
  if (toTreasury || tx.value > 0n) {
    console.log({ hash: tx.hash, from: tx.from, to: tx.to, value: formatEther(tx.value), toTreasury })
  }
}

// Check blockscout internal txs for first few txs in block
const BS = 'https://base.blockscout.com/api/v2'
for (const tx of block.transactions.slice(0, 5)) {
  if (typeof tx === 'string') continue
  const res = await fetch(`${BS}/transactions/${tx.hash}/internal-transactions`, { headers: { accept: 'application/json' } })
  const data = res.ok ? await res.json() : null
  const items = data?.items ?? []
  if (items.length) {
    console.log('internals for', tx.hash.slice(0, 14), JSON.stringify(items.slice(0, 3), null, 2))
  }
}

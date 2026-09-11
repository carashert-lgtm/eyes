// Find treasury incoming internal txs via Blockscout tx traces + narrow RPC scan
const TREASURY = '0x3dff4adfa6d7482e3ffb362aa9d6370bcc45c4b5'
const BS = 'https://base.blockscout.com/api/v2'

async function bs(path) {
  const res = await fetch(`${BS}${path}`, { headers: { accept: 'application/json' } })
  return res.ok ? res.json() : null
}

// Get outgoing txs from treasury - maybe parent txs for internal incoming
const txs = await bs(`/addresses/${TREASURY}/transactions`)
console.log('outgoing count', txs?.items?.length)

// Try advanced filters / counters
const addr = await bs(`/addresses/${TREASURY}`)
console.log('balance block', addr?.block_number_balance_updated_at)
console.log('coin_balance', addr?.coin_balance)

// Scan ONLY the balance update block ± 20 with public RPC
import { createPublicClient, formatEther, http } from 'viem'
import { base } from 'viem/chains'
const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })
const center = BigInt(addr?.block_number_balance_updated_at ?? 50146593)
const hits = []
for (let n = center - 20n; n <= center + 20n; n++) {
  const block = await client.getBlock({ blockNumber: n, includeTransactions: true })
  for (const tx of block.transactions) {
    if (typeof tx === 'string') continue
    if (tx.to?.toLowerCase() === TREASURY && tx.value > 0n) {
      hits.push({ hash: tx.hash, from: tx.from, value: formatEther(tx.value), block: n.toString() })
    }
  }
}
console.log('narrow scan hits', JSON.stringify(hits, null, 2))

// Also list unique counterparties from outgoing token txs (for hints)
const froms = new Set()
for (const tx of txs?.items ?? []) {
  if (tx.to?.hash) froms.add(tx.to.hash)
}
console.log('treasury sent tokens to', [...froms])

// List ALL internal ETH transfers to treasury in balance-update block (no wallet filter)
const TREASURY = '0x3dff4adfa6d7482e3ffb362aa9d6370bcc45c4b5'
const BS = 'https://base.blockscout.com/api/v2'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({ chain: base, transport: http('https://base.drpc.org') })

function parseVal(raw) {
  if (!raw) return 0n
  try { return raw.startsWith('0x') ? BigInt(raw) : BigInt(raw) } catch { return 0n }
}

for (const blockNum of [50146593n, 50146592n, 50146594n, 50146595n]) {
  const block = await client.getBlock({ blockNumber: blockNum, includeTransactions: true })
  console.error('block', blockNum.toString(), 'txs', block.transactions.length)
  for (const tx of block.transactions) {
    if (typeof tx === 'string') continue
    const res = await fetch(`${BS}/transactions/${tx.hash}/internal-transactions`, { headers: { accept: 'application/json' } })
    if (!res.ok) continue
    const data = await res.json()
    for (const it of data.items ?? []) {
      const to = it.to?.hash?.toLowerCase()
      const val = parseVal(it.value)
      if (to === TREASURY && val > 0n) {
        console.log(JSON.stringify({
          block: blockNum.toString(),
          parent: tx.hash,
          parentFrom: tx.from,
          internalFrom: it.from?.hash,
          valueWei: val.toString(),
          txHash: it.transaction_hash,
        }))
      }
    }
    if (tx.to?.toLowerCase() === TREASURY && tx.value > 0n) {
      console.log(JSON.stringify({ block: blockNum.toString(), kind: 'normal', from: tx.from, hash: tx.hash, valueWei: tx.value.toString() }))
    }
  }
}

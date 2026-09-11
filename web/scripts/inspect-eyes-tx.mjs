/**
 * Inspect a tx receipt for $EYES transfer logs.
 * npx tsx scripts/inspect-eyes-tx.mjs [txHash]
 */
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  getAddress,
  http,
} from 'viem'
import { base } from 'viem/chains'

const hash =
  process.argv[2] ??
  '0x2011452b5541a4eace89a6545f05f598035bbb5791d200d1fea63031bcf0944d'
const EYES = getAddress('0xC845770d0f437B93886E152566EE926Aa9153C9e')
const DEAD = getAddress('0x000000000000000000000000000000000000dEaD')
const WALLET = getAddress('0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6')

const rpcs = [
  process.env.BASE_MAINNET_RPC_URL,
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
].filter(Boolean)

const transferAbi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
]

let receipt
for (const rpc of rpcs) {
  try {
    const client = createPublicClient({ chain: base, transport: http(rpc) })
    receipt = await client.getTransactionReceipt({ hash })
    console.log('RPC OK:', rpc.replace(/\/v2\/[^/]+/, '/v2/***'))
    break
  } catch (e) {
    console.warn('RPC fail:', rpc.slice(0, 40), e.message?.slice(0, 80))
  }
}

if (!receipt) {
  console.error('Could not fetch receipt')
  process.exit(1)
}

console.log('status:', receipt.status)
console.log('logs:', receipt.logs.length)

for (const log of receipt.logs) {
  console.log('log contract:', log.address)
  if (log.address.toLowerCase() !== EYES.toLowerCase()) continue
  try {
    const decoded = decodeEventLog({ abi: transferAbi, data: log.data, topics: log.topics })
    const args = decoded.args
    console.log('EYES Transfer:', {
      from: args.from,
      to: args.to,
      value: formatUnits(args.value, 18),
      matchesBurn:
        args.from.toLowerCase() === WALLET.toLowerCase() &&
        args.to.toLowerCase() === DEAD.toLowerCase(),
    })
  } catch (e) {
    console.log('decode fail:', e.message)
    console.log('topics:', log.topics)
    console.log('data:', log.data)
  }
}

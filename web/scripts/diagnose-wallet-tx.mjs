/**
 * Diagnose Eyes wallet launch fee tx on Base.
 * npx tsx scripts/diagnose-wallet-tx.mjs
 */
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  http,
  parseUnits,
} from 'viem'
import { base } from 'viem/chains'

const WALLET = '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6'
const EYES = '0xC845770d0f437B93886E152566EE926Aa9153C9e'
const DEAD = '0x000000000000000000000000000000000000dEaD'
const BURN_AMOUNT = parseUnits('8075', 18)

const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
const client = createPublicClient({ chain: base, transport: http(rpc) })

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
]

const data = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'transfer',
  args: [DEAD, BURN_AMOUNT],
})

const [ethBal, eyesBal, nonce] = await Promise.all([
  client.getBalance({ address: WALLET }),
  client.readContract({
    address: EYES,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [WALLET],
  }),
  client.getTransactionCount({ address: WALLET }),
])

console.log('RPC:', rpc.replace(/\/v2\/[^/]+/, '/v2/***'))
console.log('Wallet:', WALLET)
console.log('ETH:', formatEther(ethBal))
console.log('EYES:', formatUnits(eyesBal, 18))
console.log('Nonce:', nonce)

try {
  const gas = await client.estimateGas({
    account: WALLET,
    to: EYES,
    data,
  })
  console.log('estimateGas OK:', gas.toString())
} catch (e) {
  console.error('estimateGas FAIL:', e.shortMessage ?? e.message)
  if (e.cause) console.error(' cause:', e.cause.shortMessage ?? e.cause.message)
}

try {
  await client.call({
    account: WALLET,
    to: EYES,
    data,
  })
  console.log('eth_call simulation OK')
} catch (e) {
  console.error('eth_call FAIL:', e.shortMessage ?? e.message)
}

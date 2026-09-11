/**
 * Test server RPC relay helpers against user wallet tx.
 * npx tsx scripts/test-wallet-rpc-relay.mjs
 */
import { encodeFunctionData, parseUnits } from 'viem'
import { relayWalletRpc } from '../lib/wallet-rpc-relay.ts'

const WALLET = '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6'
const EYES = '0xC845770d0f437B93886E152566EE926Aa9153C9e'
const DEAD = '0x000000000000000000000000000000000000dEaD'

const data = encodeFunctionData({
  abi: [
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
  ],
  functionName: 'transfer',
  args: [DEAD, parseUnits('8075', 18)],
})

const nonce = await relayWalletRpc('eth_getTransactionCount', [WALLET, 'pending'])
console.log('nonce relay:', nonce)

const gas = await relayWalletRpc('eth_estimateGas', [
  {
    from: WALLET,
    to: EYES,
    data,
  },
])
console.log('estimateGas relay:', gas)

const fee = await relayWalletRpc('eth_maxPriorityFeePerGas', [])
console.log('maxPriorityFee relay:', fee)

const block = await relayWalletRpc('eth_getBlockByNumber', ['latest', false])
console.log('latest block baseFee:', block.ok ? block.result?.baseFeePerGas : block.error)

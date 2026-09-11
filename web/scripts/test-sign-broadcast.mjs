/**
 * Sign sample tx with random key and test broadcast error from RPC.
 * npx tsx scripts/test-sign-broadcast.mjs
 */
import { createPublicClient, encodeFunctionData, http, parseTransaction, parseUnits } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const EYES = '0xC845770d0f437B93886E152566EE926Aa9153C9e'
const DEAD = '0x000000000000000000000000000000000000dEaD'
const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'

const client = createPublicClient({ chain: base, transport: http(rpc) })
const pk = generatePrivateKey()
const account = privateKeyToAccount(pk)

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
  args: [DEAD, parseUnits('1', 18)],
})

const request = await client.prepareTransactionRequest({
  account,
  to: EYES,
  data,
  chain: base,
})

const signed = await account.signTransaction(request)
console.log('signer:', account.address)
console.log('parsed:', parseTransaction(signed))

try {
  const hash = await client.sendRawTransaction({ serializedTransaction: signed })
  console.log('broadcast OK', hash)
} catch (e) {
  console.error('broadcast FAIL:', e.shortMessage ?? e.message)
  console.error('details:', e.details ?? e.cause?.message)
}

// Wrong-key tx targeting funded wallet nonce pattern
const WALLET = '0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6'
const nonce = await client.getTransactionCount({ address: WALLET })
const wrongSigned = await account.signTransaction({
  ...request,
  nonce,
  to: EYES,
  data,
  chainId: base.id,
})

try {
  await client.sendRawTransaction({ serializedTransaction: wrongSigned })
} catch (e) {
  console.error('wrong signer broadcast FAIL:', e.shortMessage ?? e.message)
  console.error('details:', e.details ?? e.cause?.message)
}

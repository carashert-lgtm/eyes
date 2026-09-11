/**
 * Verify presale distributor wallet holds $EYES on the configured chain.
 */
import '../load-env.js'
import { getTreasuryAddress } from '../bot-format.js'
import { createPublicClient, formatUnits, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
]

function getKey() {
  const raw = (
    process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY ??
    process.env.DEPLOYER_PRIVATE_KEY ??
    ''
  ).trim()
  if (!raw) throw new Error('PRESALE_DISTRIBUTOR_PRIVATE_KEY not set')
  return raw.startsWith('0x') ? raw : `0x${raw}`
}

const chainId = Number(process.env.PRESALE_CHAIN_ID ?? '8453')
const token =
  process.env.EYES_TOKEN_ADDRESS ??
  process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS ??
  ''
const treasury = getTreasuryAddress()

if (!token) throw new Error('EYES_TOKEN_ADDRESS not set')

const key = getKey()
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
  throw new Error('PRESALE_DISTRIBUTOR_PRIVATE_KEY must be 32-byte hex')
}

const account = privateKeyToAccount(key)
const rpc =
  chainId === 31337
    ? (process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? 'http://127.0.0.1:8545')
    : (process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org')

const client = createPublicClient({
  chain: chainId === 31337 ? { id: 31337, rpcUrls: { default: { http: [rpc] } } } : base,
  transport: http(rpc),
})

const distributorBal = await client.readContract({
  address: token,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [account.address],
})

const [ethBal, pendingNonce, latestNonce] = await Promise.all([
  client.getBalance({ address: account.address }),
  client.getTransactionCount({ address: account.address, blockTag: 'pending' }),
  client.getTransactionCount({ address: account.address, blockTag: 'latest' }),
])

const treasuryBal = await client.readContract({
  address: token,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [treasury],
})

console.log(JSON.stringify({
  chainId,
  token,
  distributorAddress: account.address,
  treasuryAddress: treasury,
  distributorMatchesTreasury: account.address.toLowerCase() === treasury.toLowerCase(),
  distributorBalanceEyes: formatUnits(distributorBal, 18),
  treasuryBalanceEyes: formatUnits(treasuryBal, 18),
  ethBalance: formatUnits(ethBal, 18),
  noncePending: pendingNonce,
  nonceLatest: latestNonce,
  pendingTxGap: pendingNonce - latestNonce,
}, null, 2))

if (account.address.toLowerCase() !== treasury.toLowerCase()) {
  console.error(
    '\nFAIL: PRESALE_DISTRIBUTOR_PRIVATE_KEY must control the treasury wallet that holds presale $EYES.',
  )
  process.exit(1)
}

if (distributorBal === 0n) {
  console.error('\nFAIL: distributor wallet has 0 $EYES — !presalesend cannot transfer.')
  process.exit(1)
}

console.log('\nOK distributor ready for !presalesend')

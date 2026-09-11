/**
 * Find which env private key controls the mainnet treasury (prints address only, never the key).
 */
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, formatUnits, http } from 'viem'
import { base } from 'viem/chains'

const treasury = (
  process.env.EYES_TREASURY ??
  '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'
).toLowerCase()

const token =
  process.env.EYES_TOKEN_ADDRESS ??
  process.env.EYES_TOKEN ??
  '0xC845770d0f437B93886E152566EE926Aa9153C9e'

const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'

const candidates = [
  ['PRESALE_DISTRIBUTOR_MAINNET_KEY', process.env.PRESALE_DISTRIBUTOR_MAINNET_KEY],
  ['TREASURY_PRIVATE_KEY', process.env.TREASURY_PRIVATE_KEY],
  ['DEPLOYER_PRIVATE_KEY', process.env.DEPLOYER_PRIVATE_KEY],
  ['PRESALE_DISTRIBUTOR_PRIVATE_KEY', process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY],
].filter(([, v]) => v?.trim())

function normalizeKey(raw) {
  const t = raw.trim()
  return t.startsWith('0x') ? t : `0x${t}`
}

let matched = null
const checked = []

for (const [label, raw] of candidates) {
  try {
    const account = privateKeyToAccount(normalizeKey(raw))
    const matches = account.address.toLowerCase() === treasury
    checked.push({ label, address: account.address, matches })
    if (matches && !matched) matched = { label, key: normalizeKey(raw) }
  } catch {
    checked.push({ label, address: null, matches: false, error: 'invalid key format' })
  }
}

let balanceEyes = null
let balanceEth = null
if (matched) {
  const client = createPublicClient({ chain: base, transport: http(rpc) })
  const erc20 = [
    {
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
  ]
  const [eyes, eth] = await Promise.all([
    client.readContract({
      address: token,
      abi: erc20,
      functionName: 'balanceOf',
      args: [treasury],
    }),
    client.getBalance({ address: treasury }),
  ])
  balanceEyes = formatUnits(eyes, 18)
  balanceEth = formatUnits(eth, 18)
}

console.log(
  JSON.stringify(
    {
      treasury,
      token,
      rpcHost: new URL(rpc).host,
      matchedKeySource: matched?.label ?? null,
      checked,
      balanceEyes,
      balanceEth,
    },
    null,
    2,
  ),
)

if (!matched) process.exit(1)

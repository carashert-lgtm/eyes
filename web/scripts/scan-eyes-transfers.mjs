/**
 * Find recent $EYES transfers from launch wallet.
 * npx tsx scripts/scan-eyes-transfers.mjs
 */
import { createPublicClient, formatUnits, getAddress, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'

const WALLET = getAddress('0xB1Ab6d74368CD27b45051a59D9DD5411Fc30CCE6')
const EYES = getAddress('0xC845770d0f437B93886E152566EE926Aa9153C9e')
const FEE = getAddress('0xcC61A3C647d416A124143Be1c367232BAA8fa51f')
const PRESALE = getAddress('0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5')
const DEAD = getAddress('0x000000000000000000000000000000000000dEaD')

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
})

const latest = await client.getBlockNumber()
const fromBlock = latest - BigInt(500_000)
const CHUNK = BigInt(9_000)

const logs = []
for (let start = fromBlock; start <= latest; start += CHUNK) {
  const end = start + CHUNK - BigInt(1) > latest ? latest : start + CHUNK - BigInt(1)
  const chunk = await client.getLogs({
    address: EYES,
    event: parseAbiItem(
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ),
    args: { from: WALLET },
    fromBlock: start,
    toBlock: end,
  })
  logs.push(...chunk)
}

console.log(`Transfers from ${WALLET} (last ~500k blocks): ${logs.length}`)
for (const log of logs.slice(-15)) {
  const to = getAddress(log.args.to)
  const amt = formatUnits(log.args.value, 18)
  const label =
    to === DEAD ? 'BURN' : to === FEE ? 'FEE_COLLECTOR' : to === PRESALE ? 'PRESALE' : to
  console.log(`${log.transactionHash} → ${label} ${amt}`)
}

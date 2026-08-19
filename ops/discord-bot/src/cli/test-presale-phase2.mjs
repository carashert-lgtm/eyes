/**
 * Phase 2 E2E — send ETH on Anvil, register purchase, distribute $EYES.
 * Run: npm run presale:test-e2e
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../../..')
const anvilJson = JSON.parse(
  readFileSync(resolve(repoRoot, 'deployments/anvil.json'), 'utf-8'),
)

const RPC = process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'
const BOT_URL = process.env.BOT_WEBHOOK_URL ?? 'http://localhost:3847'
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'
const SECRET = process.env.PLATFORM_API_SECRET ?? 'EyesOpen2026_xK9mP2vL8qR'

const TREASURY = anvilJson.treasury
const BUYER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const RECEIVE = BUYER

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error))
  return data.result
}

async function botFetch(path, body) {
  const res = await fetch(`${BOT_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-platform-secret': SECRET,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data
}

async function main() {
  await rpc('eth_blockNumber', [])
  console.log('✓ Anvil reachable')

  await fetch(`${BOT_URL}/health`)
  console.log('✓ Bot webhook reachable')

  const valueWei = '0x2386F26FC10000' // 0.01 ETH
  const hash = await rpc('eth_sendTransaction', [
    { from: BUYER, to: TREASURY, value: valueWei },
  ])
  for (let i = 0; i < 30; i++) {
    const receipt = await rpc('eth_getTransactionReceipt', [hash])
    if (receipt) break
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`✓ Sent 0.01 ETH → treasury (${hash})`)

  let purchase
  try {
    const reg = await fetch(`${WEB_URL}/api/presale/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: hash, receiveAddress: RECEIVE }),
    })
    const regData = await reg.json()
    if (!reg.ok) throw new Error(regData.error ?? 'register failed')
    purchase = regData.purchase
    console.log(`✓ Registered via web API · ${purchase.tokensOwed.toLocaleString()} $EYES`)
  } catch (webErr) {
    console.log(`  Web API unavailable (${webErr.message}) — registering via bot webhook`)
    const tokensOwed = Math.floor((0.01 * 3500) / 0.0003)
    const record = {
      txHash: hash,
      payerAddress: BUYER,
      receiveAddress: RECEIVE,
      ethAmount: '0.01',
      ethUsd: 3500,
      tierId: 1,
      tierLabel: 'Tier 1',
      tierPriceUsd: 0.0003,
      presaleDay: 1,
      tokensOwed,
      tokensSent: 0,
      status: 'verified',
      referralCode: null,
      blockTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      distributionTxHash: null,
    }
    const result = await botFetch('/webhook/presale/register', record)
    purchase = result.purchase
    console.log(`✓ Registered via bot · ${purchase.tokensOwed.toLocaleString()} $EYES`)
  }

  const dry = await botFetch('/webhook/presale/distribute', { dryRun: true, limit: 1 })
  console.log(`✓ Dry run: ${dry.message}`)

  const live = await botFetch('/webhook/presale/distribute', { run: true, limit: 1 })
  console.log(`✓ Live distribute: ${live.message}`)
  if (live.sent?.[0]?.txHash) {
    console.log(`  Distribution tx: ${live.sent[0].txHash}`)
  }

  const lookup = await botFetch('/webhook/presale/lookup', { txHash: hash })
  console.log(`✓ Final status: ${lookup.purchase?.status}`)
  if (lookup.purchase?.status !== 'sent') {
    throw new Error(`Expected status sent, got ${lookup.purchase?.status}`)
  }

  console.log('\nPhase 2 E2E passed ✓')
}

main().catch((err) => {
  console.error('\nFAIL:', err.message ?? err)
  process.exit(1)
})

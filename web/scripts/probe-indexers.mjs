// Quick probe: Blockscout + production API + known treasury internals
const TREASURY = '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'
const BS = 'https://base.blockscout.com/api/v2'

async function bs(path) {
  const res = await fetch(`${BS}${path}`, { headers: { accept: 'application/json' } })
  const text = await res.text()
  console.log('\n===', path, 'status', res.status, '===')
  console.log(text.slice(0, 4000))
}

await bs(`/addresses/${TREASURY.toLowerCase()}`)
await bs(`/addresses/${TREASURY.toLowerCase()}/internal-transactions`)
await bs(`/addresses/${TREASURY.toLowerCase()}/transactions`)
await bs(`/addresses/${TREASURY.toLowerCase()}/coin-balance-history`)

// Production register probe with a dummy wallet
const prod = await fetch('https://www.eyesopen.to/api/presale/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' }),
})
console.log('\n=== production register ===')
console.log(prod.status, await prod.text())

import { findPresalePaymentCandidates } from '../lib/presale-wallet-discovery.ts'

const wallet = process.argv[2]
if (!wallet) {
  console.error('Usage: node scripts/test-discovery.mjs <walletAddress>')
  process.exit(1)
}

const candidates = await findPresalePaymentCandidates(wallet)
console.log(JSON.stringify(candidates, null, 2))

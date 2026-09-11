import { findPresalePaymentCandidates } from '../lib/presale-wallet-discovery.ts'

const wallet = process.argv[2] ?? '0x2C8988415c9f2D2a8F9bAE2489e400e3a351d00f'
const candidates = await findPresalePaymentCandidates(wallet)
console.log(JSON.stringify(candidates, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2))

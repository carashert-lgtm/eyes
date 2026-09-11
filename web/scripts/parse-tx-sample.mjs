/**
 * Parse a partial signed tx hex from error logs.
 * npx tsx scripts/parse-tx-sample.mjs
 */
import { parseTransaction } from 'viem'

const sample =
  '0x02f8af82210580830f4240836acfc082ca3794c845770d0f437b93886e152566ee926aa9153c9e80b844a9059cbb000000000000000000000000000000000000000000000000000000000000dead0000000000000000000000000000000000000000000001b5bf22f4d0ff4c0000'

try {
  const tx = parseTransaction(sample)
  console.log(tx)
} catch (e) {
  console.error('parse failed (truncated tx expected):', e.message)
}

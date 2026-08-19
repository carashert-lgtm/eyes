/**
 * CLI — send pending presale $EYES from treasury wallet.
 *
 * Usage:
 *   npm run presale:distribute              # dry run (default)
 *   npm run presale:distribute -- --run     # live transfers
 *   npm run presale:distribute -- --run --limit 3
 */
import '../load-env.js'
import { distributePresaleTokens } from '../presale-distribute.js'

const args = process.argv.slice(2)
const dryRun = !args.includes('--run')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limitFlagIdx = args.indexOf('--limit')
const limit = limitArg
  ? Number(limitArg.split('=')[1])
  : limitFlagIdx >= 0
    ? Number(args[limitFlagIdx + 1])
    : undefined

async function main() {
  const result = await distributePresaleTokens({ dryRun, limit })
  console.log(JSON.stringify(result, null, 2))
  if (result.skipped?.length) {
    process.exitCode = result.sent?.length ? 0 : 1
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})

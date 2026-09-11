/**
 * Logic test for alerts feed — run before deploy:
 *   npx tsx scripts/test-alerts-feed.mjs
 */
import { generateAlertsFromSnapshot } from '../lib/alerts-generator.ts'
import { EMPTY_LAUNCHES_SNAPSHOT } from '../lib/launch-types.ts'
import { filterAlertsForTier, upsertAlerts, readRetentionLedger } from '../lib/retention-store.ts'

process.env.VERCEL = '1'

const snapshot = EMPTY_LAUNCHES_SNAPSHOT
const generated = generateAlertsFromSnapshot(snapshot)

if (!Array.isArray(generated)) {
  console.error('FAIL: expected alerts array from empty snapshot')
  process.exit(1)
}

for (const alert of generated) {
  if (String(alert.title).includes('Open Horizon') || String(alert.title).includes('HORZN')) {
    console.error('FAIL: demo launch leaked into alerts')
    process.exit(1)
  }
}

const scout = filterAlertsForTier(generated, 'scout', 30)
for (const alert of scout) {
  if (!alert.id || !alert.title || !alert.body || !alert.createdAt) {
    console.error('FAIL: malformed alert', alert)
    process.exit(1)
  }
}

try {
  if (generated.length > 0) {
    upsertAlerts(generated.slice(0, 3))
    const ledger = readRetentionLedger()
    if (ledger.alerts.length === 0) {
      console.error('FAIL: memory ledger should retain upserted alerts on VERCEL=1')
      process.exit(1)
    }
  }
} catch (err) {
  console.error('FAIL: upsertAlerts threw on VERCEL=1', err)
  process.exit(1)
}

console.log('PASS alerts feed logic', {
  generated: generated.length,
  scoutVisible: scout.length,
})

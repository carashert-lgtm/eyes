/**
 * Logic test — no bundled demo launches. Run before deploy:
 *   npx tsx scripts/test-launches-data.mjs
 */
import { EMPTY_LAUNCHES_SNAPSHOT } from '../lib/launch-types.ts'
import { generateAlertsFromSnapshot } from '../lib/alerts-generator.ts'
import { filterAlertsForTier } from '../lib/retention-store.ts'
import { getCachedLaunchesSnapshot, setCachedLaunchesSnapshot } from '../lib/launch-snapshot-cache.ts'

let failed = 0
function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

if (EMPTY_LAUNCHES_SNAPSHOT.source !== 'indexer') {
  fail(`empty snapshot source must be indexer, got ${EMPTY_LAUNCHES_SNAPSHOT.source}`)
}

if (EMPTY_LAUNCHES_SNAPSHOT.launches.length !== 0) {
  fail('empty snapshot must have zero launches')
}

const emptyAlerts = generateAlertsFromSnapshot(EMPTY_LAUNCHES_SNAPSHOT)
if (!Array.isArray(emptyAlerts)) {
  fail('generateAlertsFromSnapshot must return an array for empty feed')
}

for (const alert of emptyAlerts) {
  if (/Open Horizon|HORZN|Builder Alpha|Fair Signal/i.test(String(alert.title))) {
    fail(`demo launch name leaked into alerts: ${alert.title}`)
  }
}

const filtered = filterAlertsForTier(emptyAlerts, 'scout', 30)
if (!Array.isArray(filtered)) {
  fail('filterAlertsForTier must return an array')
}

setCachedLaunchesSnapshot({
  updatedAt: new Date().toISOString(),
  source: 'indexer',
  launches: [],
})
const cached = getCachedLaunchesSnapshot()
if (!cached || cached.launches.length !== 0) {
  fail('snapshot cache should round-trip empty indexer snapshot')
}

console.log('PASS launches data logic', {
  emptyLaunchCount: EMPTY_LAUNCHES_SNAPSHOT.launches.length,
  emptyAlertCount: emptyAlerts.length,
  scoutVisible: filtered.length,
})

process.exit(failed)

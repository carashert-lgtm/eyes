/**
 * Settings + Launch API smoke test
 *   SITE_URL=https://www.eyesopen.to node scripts/test-settings-api.mjs
 */
const SITE = process.env.SITE_URL?.trim() ?? 'http://localhost:3000'
let failed = 0

function fail(msg) {
  console.error('FAIL:', msg)
  failed++
}

async function get(path) {
  const res = await fetch(`${SITE}${path}`)
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

console.log('Testing against', SITE)

const docs = await get('/api/v1/docs')
if (!docs.res.ok || !docs.json.endpoints?.length) {
  fail(`v1 docs: ${docs.res.status} ${JSON.stringify(docs.json)}`)
} else {
  console.log('PASS v1 docs', docs.json.title)
}

const launches = await get('/api/v1/launches?limit=3')
if (!launches.res.ok || !Array.isArray(launches.json.launches)) {
  fail(`v1 launches: ${launches.res.status}`)
} else {
  console.log('PASS v1 launches', launches.json.total, 'total')
}

const settings = await get('/api/settings')
if (settings.res.status !== 401) {
  fail(`settings should require auth, got ${settings.res.status}`)
} else {
  console.log('PASS settings requires auth')
}

const keys = await get('/api/settings/api-keys')
if (keys.res.status !== 401) {
  fail(`api-keys should require auth, got ${keys.res.status}`)
} else {
  console.log('PASS api-keys requires auth')
}

const mine = await get('/api/v1/launches/mine')
if (mine.res.status !== 401) {
  fail(`launches/mine should require API key, got ${mine.res.status}`)
} else {
  console.log('PASS launches/mine requires API key')
}

if (launches.json.launches?.[0]?.id) {
  const detail = await get(`/api/v1/launches/${launches.json.launches[0].id}`)
  if (!detail.res.ok || !detail.json.launch) {
    fail(`v1 launch detail: ${detail.res.status}`)
  } else {
    console.log('PASS v1 launch detail', detail.json.launch.id)
  }
}

if (failed === 0) {
  console.log('\nAll public API checks passed.')
} else {
  console.log(`\n${failed} check(s) failed.`)
  process.exit(1)
}

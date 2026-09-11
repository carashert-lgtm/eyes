/**
 * Smoke test for the launch embed widget (headers + HTML + API).
 * Usage: node scripts/embed-widget-smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2]?.replace(/\/$/, '') || 'https://www.eyesopen.to'

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`Embed widget smoke test → ${BASE}\n`)

  const launchesRes = await fetch(`${BASE}/api/launches?limit=1&sort=newest`)
  if (!launchesRes.ok) {
    fail('GET /api/launches', String(launchesRes.status))
    summarize()
    process.exit(1)
  }
  const launchesJson = await launchesRes.json()
  const launch = launchesJson.launches?.[0]
  if (!launch?.id) {
    fail('launches list has at least one launch')
    summarize()
    process.exit(1)
  }
  pass('GET /api/launches', launch.id)

  const embedRes = await fetch(`${BASE}/embed/launch/${encodeURIComponent(launch.id)}`)
  if (embedRes.status !== 200) {
    fail('GET /embed/launch/[id]', String(embedRes.status))
  } else {
    pass('GET /embed/launch/[id]', '200')
  }

  const csp = embedRes.headers.get('content-security-policy') ?? ''
  if (csp.includes('frame-ancestors *')) {
    pass('embed CSP allows framing', 'frame-ancestors *')
  } else {
    fail('embed CSP allows framing', csp || 'missing CSP')
  }

  if (embedRes.headers.get('x-frame-options')?.toUpperCase() === 'DENY') {
    fail('embed X-Frame-Options', 'DENY blocks iframe preview')
  } else {
    pass('embed X-Frame-Options', 'not DENY')
  }

  const html = await embedRes.text()
  if (html.includes(launch.name)) {
    pass('embed HTML includes launch name', launch.name)
  } else {
    fail('embed HTML includes launch name', launch.name)
  }

  const detailRes = await fetch(`${BASE}/api/launches/${encodeURIComponent(launch.id)}`)
  if (detailRes.ok) {
    pass('GET /api/launches/[id] validates launch')
  } else {
    fail('GET /api/launches/[id]', String(detailRes.status))
  }

  const badRes = await fetch(`${BASE}/embed/launch/not-a-real-launch-id`)
  if (badRes.status === 404) {
    pass('invalid embed id returns 404')
  } else {
    fail('invalid embed id returns 404', String(badRes.status))
  }

  const homeRes = await fetch(`${BASE}/app/settings`)
  const homeCsp = homeRes.headers.get('content-security-policy') ?? ''
  const homeXfo = homeRes.headers.get('x-frame-options') ?? ''
  if (homeCsp.includes("frame-ancestors 'none'") || homeXfo.toUpperCase() === 'DENY') {
    pass('main app still blocks framing')
  } else {
    fail('main app still blocks framing', 'settings page may be embeddable unintentionally')
  }

  summarize()
  process.exit(results.some((r) => !r.ok) ? 1 : 0)
}

function summarize() {
  const ok = results.filter((r) => r.ok).length
  console.log(`\n${ok}/${results.length} checks passed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

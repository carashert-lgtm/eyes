#!/usr/bin/env node
/**
 * Test team activation against Railway + production site (read-only diagnosis).
 * Usage: node scripts/test-team-activate.mjs TEAM-XXXXXXXX
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const code = process.argv[2] ?? 'TEAM-TEST1234'
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../../web/.env.local')

function loadEnv(path) {
  const map = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      map[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  } catch {
    /* ignore */
  }
  return map
}

const env = loadEnv(envPath)
const secret = env.PLATFORM_API_SECRET ?? process.env.PLATFORM_API_SECRET ?? ''
const railwayUrl = 'https://eyesteam-production.up.railway.app'
const siteUrl = 'https://www.eyesopen.to'

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

console.log('Testing code:', code)
console.log('Secret set:', secret ? `${secret.slice(0, 4)}…` : '(missing)')

const health = await fetch(`${railwayUrl}/health`).then((r) => r.json())
console.log('\nRailway health:', JSON.stringify(health, null, 2))

console.log('\n--- Railway /webhook/team-activate ---')
const railway = await post(
  `${railwayUrl}/webhook/team-activate`,
  secret ? { 'x-platform-secret': secret } : {},
  { code, clientIp: '127.0.0.1' },
)
console.log('Status:', railway.status)
console.log('Body:', JSON.stringify(railway.json, null, 2))

console.log('\n--- Production /api/team/activate ---')
const site = await post(`${siteUrl}/api/team/activate`, {}, { code })
console.log('Status:', site.status)
console.log('Body:', JSON.stringify(site.json, null, 2))

console.log('\nLocal .env BOT_WEBHOOK_URL:', env.BOT_WEBHOOK_URL ?? '(unset)')
console.log('(Production Vercel must use Railway URL, not localhost)')

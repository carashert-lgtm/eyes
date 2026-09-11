#!/usr/bin/env node
/** Auth probe only — uses invalid code so nothing is consumed. */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../../web/.env.local')

function loadEnv(path) {
  const map = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return map
}

const env = loadEnv(envPath)
const secret = env.PLATFORM_API_SECRET ?? ''
const url = 'https://eyesteam-production.up.railway.app/webhook/team-activate'
const body = JSON.stringify({ code: 'TEAM-INVALID1', clientIp: '127.0.0.1' })

async function probe(label, headers) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body })
  const json = await res.json().catch(() => ({}))
  console.log(`${label}: HTTP ${res.status}`, JSON.stringify(json))
}

console.log('Local secret prefix:', secret ? secret.slice(0, 6) + '…' : '(missing)')
await probe('No auth header', {})
await probe('With local .env secret', secret ? { 'x-platform-secret': secret } : {})
await probe('Wrong secret', { 'x-platform-secret': 'wrong-secret-value' })

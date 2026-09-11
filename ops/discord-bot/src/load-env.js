/**
 * Load bot env from multiple files (later files override earlier).
 *
 * Local dev: put shared secrets in web/.env.local (same file Next.js uses).
 * Optional: repo-root local.env for machine-only overrides.
 */
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { lpcConfigured } from './lpc.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const botDir = path.join(__dirname, '..')
const repoRoot = path.join(botDir, '../..')

/** @type {{ label: string; path: string }[]} */
const sources = []

function loadEnvFile(label, filePath, override) {
  if (!existsSync(filePath)) return
  dotenv.config({ path: filePath, override })
  sources.push({ label, path: filePath })
}

loadEnvFile('bot .env', path.join(botDir, '.env'), false)
loadEnvFile('repo local.env', path.join(repoRoot, 'local.env'), true)
loadEnvFile('web .env.local', path.join(repoRoot, 'web', '.env.local'), true)

export const loadedEnvSources = sources

export function logEnvSources() {
  if (!sources.length) {
    console.warn('No env files loaded — copy ops/discord-bot/.env.example to .env')
    return
  }
  console.log('Env loaded from:')
  for (const s of sources) {
    console.log(`  · ${s.label} (${s.path})`)
  }
}

export function logEnvHealth() {
  const checks = [
    ['DISCORD_BOT_TOKEN', Boolean(process.env.DISCORD_BOT_TOKEN?.trim())],
    ['DISCORD_OWNER_IDS', Boolean(process.env.DISCORD_OWNER_IDS?.trim())],
    ['DISCORD_GUILD_ID', Boolean(process.env.DISCORD_GUILD_ID?.trim())],
    ['PLATFORM_API_SECRET', Boolean(process.env.PLATFORM_API_SECRET?.trim())],
    ['LPC_BOT_KEY or warden.key', lpcConfigured()],
  ]
  for (const [key, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${key}`)
  }
  if (!process.env.DISCORD_BOT_TOKEN?.trim()) {
    console.error(
      'DISCORD_BOT_TOKEN missing — add it to web/.env.local or ops/discord-bot/.env',
    )
  }
  const ownerIds = process.env.DISCORD_OWNER_IDS ?? ''
  if (ownerIds.includes('123456789012345678')) {
    console.warn(
      'DISCORD_OWNER_IDS still contains the placeholder — replace with your real Discord user ID (run !whoami in Discord)',
    )
  }
  if (!process.env.PLATFORM_API_SECRET?.trim()) {
    console.warn(
      'PLATFORM_API_SECRET missing — web → bot webhooks will fail auth until set (same value in web/.env.local)',
    )
  }
}

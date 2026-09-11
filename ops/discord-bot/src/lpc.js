/** Call Launchpad Command on the always-on PC. */

import { existsSync, readFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { enqueueLpcJob } from './lpc-jobs.js'

let registeredHost = ''

export function setRegisteredLpcHost(url) {
  registeredHost = String(url || '').replace(/\/$/, '')
}

export function getRegisteredLpcHost() {
  return registeredHost
}

function lpcHost() {
  return (registeredHost || process.env.LPC_HOST || 'http://127.0.0.1:7741').replace(/\/$/, '')
}

function lpcKey() {
  const fromEnv = (process.env.LPC_BOT_KEY || '').trim()
  if (fromEnv) return fromEnv
  const file = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'LaunchpadCommand', 'warden.key')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  return ''
}

export function lpcConfigured() {
  return Boolean(lpcKey())
}

function hostLooksPublic() {
  const host = lpcHost()
  if (!host.startsWith('https://')) return false
  if (host.includes('127.0.0.1') || host.includes('localhost')) return false
  if (/^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false
  return true
}

async function liveLpcRequest(pathname, opts = {}) {
  const key = lpcKey()
  if (!key) {
    throw new Error('LPC warden key missing. Start the Launchpad Command host on this PC, then retry.')
  }
  const discordId = String(opts.discordId || '').replace(/\D/g, '')
  const method = opts.method || 'GET'
  let url = `${lpcHost()}${pathname}`
  if (method === 'GET' && discordId) {
    url += `${pathname.includes('?') ? '&' : '?'}discord_id=${encodeURIComponent(discordId)}`
  }
  const body = method === 'GET' ? undefined : { ...(opts.body || {}), discord_id: discordId }
  const res = await fetch(url, {
    method,
    headers: {
      'X-LPC-Key': key,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }
  if (!res.ok) {
    const detail = data.detail || data.message || text.slice(0, 240) || String(res.status)
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return data
}

export async function lpcRequest(pathname, opts = {}) {
  if (hostLooksPublic()) {
    try {
      return await liveLpcRequest(pathname, opts)
    } catch {
      // Railway often cannot open Cloudflare quick tunnels. The exe pulls the job instead.
    }
  }
  const discordId = String(opts.discordId || '').replace(/\D/g, '')
  const { done } = enqueueLpcJob({
    pathname,
    method: opts.method || 'GET',
    body: opts.body || {},
    discordId,
  })
  const result = await done
  if (!result?.ok) {
    throw new Error(
      result?.error ||
        'Cannot reach Launchpad Command. Open LaunchpadCommand.exe on the PC that owns that X account.',
    )
  }
  return result.data
}

export function formatLpcStatus(s) {
  const when = s.next_post_at
    ? new Date(s.next_post_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—'
  const lines = [
    `**$${s.ticker}** @${s.handle || 'unlinked'}`,
    `Auto ${s.auto ? 'on' : 'off'} · ${s.remaining_today} left today (${s.posts_per_day}/day)`,
    s.window_open ? 'Window open (8am–11pm).' : 'Window closed (8am–11pm).',
    `Next original at ${when}.`,
  ]
  if (s.boosting) lines.push('Repost is live.')
  else if (s.boost_overdue) lines.push('Repost is overdue.')
  else if (s.boost_due_in_min != null) lines.push(`Repost in ${s.boost_due_in_min} min.`)
  if (s.boost_error) lines.push(String(s.boost_error))
  return lines.join('\n')
}

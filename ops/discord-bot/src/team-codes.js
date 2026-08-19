import { randomBytes } from 'crypto'
import { db, logAudit } from './db.js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_FAILS = 8

db.exec(`
  CREATE TABLE IF NOT EXISTS team_activation_codes (
    code TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    assigned_discord_id TEXT,
    assigned_username TEXT,
    used_by_discord_id TEXT,
    used_at TEXT,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS team_sessions (
    token TEXT PRIMARY KEY,
    discord_id TEXT,
    username TEXT,
    code_used TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS team_activation_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_ip TEXT NOT NULL,
    code_attempt TEXT,
    success INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
`)

function generateCode() {
  let suffix = ''
  const bytes = randomBytes(8)
  for (let i = 0; i < 8; i++) {
    suffix += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }
  return `TEAM-${suffix}`
}

function normalizeCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function createTeamActivationCode(createdBy, assignedDiscordId = null, assignedUsername = null) {
  let code = generateCode()
  while (db.prepare('SELECT 1 FROM team_activation_codes WHERE code = ?').get(code)) {
    code = generateCode()
  }
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO team_activation_codes
     (code, created_by, created_at, assigned_discord_id, assigned_username, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
  ).run(code, createdBy, now, assignedDiscordId, assignedUsername)
  logAudit(
    'teamcode_create',
    createdBy,
    assignedDiscordId,
    null,
    assignedDiscordId ? `assigned:${assignedUsername}` : code,
  )
  return db.prepare('SELECT * FROM team_activation_codes WHERE code = ?').get(code)
}

export function listTeamActivationCodes(limit = 25) {
  return db
    .prepare(
      `SELECT * FROM team_activation_codes
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit)
}

export function revokeTeamActivationCode(codeRaw, actorId) {
  const code = normalizeCode(codeRaw)
  const row = db.prepare('SELECT * FROM team_activation_codes WHERE code = ?').get(code)
  if (!row) throw new Error('Code not found')
  if (row.status !== 'active') throw new Error(`Code is already ${row.status}`)
  db.prepare(`UPDATE team_activation_codes SET status = 'revoked' WHERE code = ?`).run(code)
  logAudit('teamcode_revoke', actorId, row.assigned_discord_id, null, code)
  return db.prepare('SELECT * FROM team_activation_codes WHERE code = ?').get(code)
}

function countRecentFailedAttempts(clientIp) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM team_activation_attempts
       WHERE client_ip = ? AND success = 0 AND created_at >= ?`,
    )
    .get(clientIp, since)
  return row?.n ?? 0
}

function recordActivationAttempt(clientIp, codeAttempt, success) {
  db.prepare(
    `INSERT INTO team_activation_attempts (client_ip, code_attempt, success, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(clientIp, codeAttempt ?? null, success ? 1 : 0, new Date().toISOString())
}

export function activateTeamCode(codeRaw, clientIp = 'unknown') {
  const code = normalizeCode(codeRaw)
  if (!code) throw new Error('Activation code required')

  if (countRecentFailedAttempts(clientIp) >= RATE_LIMIT_MAX_FAILS) {
    throw new Error('Too many activation attempts. Try again later.')
  }

  const row = db.prepare('SELECT * FROM team_activation_codes WHERE code = ?').get(code)
  if (!row || row.status !== 'active') {
    recordActivationAttempt(clientIp, code, false)
    throw new Error('Invalid or expired activation code')
  }

  const now = new Date().toISOString()
  const discordId = row.assigned_discord_id ?? null
  const username = row.assigned_username ?? null
  const sessionToken = randomBytes(32).toString('hex')

  db.prepare(
    `UPDATE team_activation_codes
     SET status = 'used', used_by_discord_id = ?, used_at = ?
     WHERE code = ?`,
  ).run(discordId, now, code)

  db.prepare(
    `INSERT INTO team_sessions (token, discord_id, username, code_used, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(sessionToken, discordId, username, code, now, now)

  recordActivationAttempt(clientIp, code, true)
  logAudit('teamcode_activate', clientIp, discordId, null, code)

  return {
    sessionToken,
    discordId,
    username,
    code,
  }
}

export function validateTeamSession(token) {
  if (!token) return null
  const row = db.prepare('SELECT * FROM team_sessions WHERE token = ?').get(token)
  if (!row || row.revoked) return null
  const now = new Date().toISOString()
  db.prepare('UPDATE team_sessions SET last_seen_at = ? WHERE token = ?').run(now, token)
  return {
    sessionToken: row.token,
    discordId: row.discord_id,
    username: row.username,
    codeUsed: row.code_used,
    createdAt: row.created_at,
  }
}

export function revokeTeamSession(token, actorId) {
  const row = db.prepare('SELECT * FROM team_sessions WHERE token = ?').get(token)
  if (!row) return false
  db.prepare('UPDATE team_sessions SET revoked = 1 WHERE token = ?').run(token)
  logAudit('team_session_revoke', actorId, row.discord_id, null, token.slice(0, 8))
  return true
}

export function formatTeamCodeRow(row) {
  const assigned = row.assigned_username
    ? `@${row.assigned_username}`
    : row.assigned_discord_id
      ? `<@${row.assigned_discord_id}>`
      : 'anyone'
  return `\`${row.code}\` · **${row.status}** · ${assigned} · ${new Date(row.created_at).toLocaleDateString()}`
}

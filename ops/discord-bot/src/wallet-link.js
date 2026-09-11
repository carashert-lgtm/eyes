import { randomBytes } from 'node:crypto'
import { db, config, ensureUser, exportSnapshot, logAudit } from './db.js'

const CODE_TTL_MS = 15 * 60 * 1000

function normalizeWallet(wallet) {
  const w = wallet?.trim()
  if (!w?.match(/^0x[a-fA-F0-9]{40}$/)) return null
  return w
}

function normalizeCode(raw) {
  const c = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/^EYES-/, '')
  if (!/^[A-Z0-9]{6,12}$/.test(c)) return null
  return `EYES-${c.slice(0, 8)}`
}

export function createWalletLinkCode(walletAddress) {
  const wallet = normalizeWallet(walletAddress)
  if (!wallet) throw new Error('Invalid wallet address')

  const code = `EYES-${randomBytes(4).toString('hex').toUpperCase()}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString()

  db.prepare(
    `INSERT INTO wallet_link_codes (code, wallet_address, status, expires_at, created_at)
     VALUES (?, ?, 'pending', ?, ?)`,
  ).run(code, wallet, expiresAt, now.toISOString())

  return { code, walletAddress: wallet, expiresAt }
}

export function redeemWalletLinkCode(discordId, username, rawCode) {
  const code = normalizeCode(rawCode)
  if (!code) throw new Error('Invalid link code')

  const row = db.prepare('SELECT * FROM wallet_link_codes WHERE code = ?').get(code)
  if (!row) throw new Error('Code not found or expired')
  if (row.status === 'linked' && row.discord_id === discordId) {
    return { walletAddress: row.wallet_address, code }
  }
  if (row.status !== 'pending') throw new Error('Code already used')
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`UPDATE wallet_link_codes SET status = 'expired' WHERE code = ?`).run(code)
    throw new Error('Code expired — generate a new one on eyesopen.to/app/profile')
  }

  ensureUser(discordId, username)
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE wallet_link_codes SET status = 'linked', discord_id = ? WHERE code = ? AND status = 'pending'`,
  ).run(discordId, code)
  db.prepare(
    `UPDATE users SET wallet_address = ?, updated_at = ? WHERE discord_id = ?`,
  ).run(row.wallet_address, now, discordId)

  logAudit('wallet_link_code', discordId, row.wallet_address, null, code)
  exportSnapshot()
  return { walletAddress: row.wallet_address, code }
}

export function linkWalletDirect(discordId, username, walletAddress) {
  const wallet = normalizeWallet(walletAddress)
  if (!wallet) throw new Error('Invalid wallet address')
  ensureUser(discordId, username)
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET wallet_address = ?, updated_at = ? WHERE discord_id = ?`,
  ).run(wallet, now, discordId)
  logAudit('wallet_link_direct', discordId, wallet, null, 'direct')
  exportSnapshot()
  return wallet
}

export function unlinkUserWallet(discordId) {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET wallet_address = NULL, updated_at = ? WHERE discord_id = ?`,
  ).run(now, discordId)
  logAudit('wallet_unlink', discordId, null, null, null)
  exportSnapshot()
}

export function getWalletLinkStatus(walletAddress) {
  const wallet = normalizeWallet(walletAddress)
  if (!wallet) return null
  const user = db
    .prepare('SELECT discord_id, username, wallet_address FROM users WHERE lower(wallet_address) = lower(?)')
    .get(wallet)
  if (user?.discord_id) {
    return {
      linked: true,
      discordId: user.discord_id,
      username: user.username,
      walletAddress: user.wallet_address,
    }
  }
  const pending = db
    .prepare(
      `SELECT code, expires_at FROM wallet_link_codes
       WHERE lower(wallet_address) = lower(?) AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(wallet, new Date().toISOString())
  return {
    linked: false,
    walletAddress: wallet,
    pendingCode: pending?.code ?? null,
    expiresAt: pending?.expires_at ?? null,
  }
}

export { normalizeCode, normalizeWallet }

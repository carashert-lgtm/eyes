import Database from 'better-sqlite3'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  token: process.env.DISCORD_BOT_TOKEN ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  ownerIds: (process.env.DISCORD_OWNER_IDS ?? '').split(',').filter(Boolean),
  staffLogChannelId: process.env.DISCORD_STAFF_LOG_CHANNEL_ID ?? '',
  siteUrl: process.env.SITE_URL ?? 'https://www.eyesopen.to',
  snapshotPath:
    process.env.SNAPSHOT_PATH ??
    path.join(__dirname, '../../../data/platform-snapshot.json'),
  webSnapshotPath:
    process.env.WEB_SNAPSHOT_PATH ??
    path.join(__dirname, '../../../web/data/platform-snapshot.json'),
  dbPath: process.env.DB_PATH ?? path.join(__dirname, '../data/platform.db'),
  teamPoolTokens: Number(process.env.TEAM_POOL_TOKENS ?? '120000000'),
  presaleTokenCap: Number(process.env.PRESALE_TOKEN_CAP ?? '200000000'),
  rewards: {
    discordInvite: Number(process.env.REFERRAL_REWARD_DISCORD ?? '500'),
    telegramInvite: Number(process.env.REFERRAL_REWARD_TELEGRAM ?? '500'),
    referralClick: Number(process.env.REFERRAL_REWARD_CLICK ?? '10'),
    referredJoin: Number(process.env.REFERRAL_REWARD_JOIN ?? '2500'),
    referredContribution: Number(
      process.env.REFERRAL_REWARD_CONTRIBUTION ?? '5000',
    ),
  },
  largeUnlockThreshold: Number(process.env.LARGE_UNLOCK_THRESHOLD ?? '100000'),
}

mkdirSync(path.dirname(config.dbPath), { recursive: true })

export const db = new Database(config.dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    invited_by TEXT,
    total_allocated REAL DEFAULT 0,
    locked REAL DEFAULT 0,
    unlocked REAL DEFAULT 0,
    claimed REAL DEFAULT 0,
    mcap_unlocked_tiers TEXT DEFAULT '[]',
    discord_invites INTEGER DEFAULT 0,
    telegram_invites INTEGER DEFAULT 0,
    referral_clicks INTEGER DEFAULT 0,
    referred_joins INTEGER DEFAULT 0,
    referred_contributions INTEGER DEFAULT 0,
    wallet_address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor_id TEXT,
    target_id TEXT,
    amount REAL,
    note TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS presale_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    payer_address TEXT NOT NULL,
    receive_address TEXT NOT NULL,
    eth_amount TEXT NOT NULL,
    eth_usd REAL NOT NULL,
    tier_id INTEGER,
    tier_label TEXT,
    tier_price_usd REAL NOT NULL,
    presale_day INTEGER,
    tokens_owed REAL NOT NULL,
    tokens_sent REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'verified',
    referral_code TEXT,
    block_timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL,
    distribution_tx_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS team_token_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    receive_address TEXT NOT NULL,
    tokens_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'verified',
    distribution_tx_hash TEXT,
    created_at TEXT NOT NULL
  );
`)

function migrateDb() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
  if (!cols.includes('discord_invite_tracking_enabled')) {
    db.exec(
      'ALTER TABLE users ADD COLUMN discord_invite_tracking_enabled INTEGER DEFAULT 0',
    )
  }
}

migrateDb()

function randomCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export function ensureUser(discordId, username, invitedBy = null) {
  const existing = db
    .prepare('SELECT * FROM users WHERE discord_id = ?')
    .get(discordId)
  if (existing) return existing

  let code = randomCode()
  while (db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code)) {
    code = randomCode()
  }
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (discord_id, username, referral_code, invited_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(discordId, username, code, invitedBy, now, now)

  if (invitedBy) {
    db.prepare(
      'UPDATE users SET referred_joins = referred_joins + 1, updated_at = ? WHERE discord_id = ?',
    ).run(now, invitedBy)
    grantLocked(invitedBy, config.rewards.referredJoin, 'referred_join')
  }

  exportSnapshot()
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
}

export function grantLocked(discordId, amount, note) {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET
      total_allocated = total_allocated + ?,
      locked = locked + ?,
      updated_at = ?
     WHERE discord_id = ?`,
  ).run(amount, amount, now, discordId)
  logAudit('grant_locked', null, discordId, amount, note)
  exportSnapshot()
}

export function grantUnlocked(discordId, amount, note) {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET
      total_allocated = total_allocated + ?,
      unlocked = unlocked + ?,
      updated_at = ?
     WHERE discord_id = ?`,
  ).run(amount, amount, now, discordId)
  logAudit('grant_unlocked', null, discordId, amount, note)
  exportSnapshot()
}

export function moveLockToUnlock(discordId, amount, note) {
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
  if (!user || user.locked < amount) throw new Error('Insufficient locked balance')
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET locked = locked - ?, unlocked = unlocked + ?, updated_at = ? WHERE discord_id = ?`,
  ).run(amount, amount, now, discordId)
  logAudit('unlock', null, discordId, amount, note)
  exportSnapshot()
}

export function removeShare(discordId, amount, note) {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET
      total_allocated = MAX(0, total_allocated - ?),
      locked = MAX(0, locked - ?),
      updated_at = ?
     WHERE discord_id = ?`,
  ).run(amount, amount, now, discordId)
  logAudit('remove_share', null, discordId, amount, note)
  exportSnapshot()
}

/** Owner-only: zero locked, unlocked, claimed, and total for one user. */
export function resetUserAllocation(discordId, actorId, note = 'teamreset') {
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
  if (!user) throw new Error('User not found')
  const cleared = user.total_allocated + user.unlocked + user.claimed
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE users SET
      total_allocated = 0,
      locked = 0,
      unlocked = 0,
      claimed = 0,
      updated_at = ?
     WHERE discord_id = ?`,
  ).run(now, discordId)
  logAudit('reset_allocation', actorId, discordId, cleared, note)
  exportSnapshot()
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
}

export function setAllocation(discordId, amount) {
  const now = new Date().toISOString()
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
  if (!user) throw new Error('User not found')
  const diff = amount - user.total_allocated
  db.prepare(
    `UPDATE users SET total_allocated = ?, locked = locked + ?, updated_at = ? WHERE discord_id = ?`,
  ).run(amount, diff > 0 ? diff : 0, now, discordId)
  logAudit('set_allocation', null, discordId, amount, 'set')
  exportSnapshot()
}

export function logAudit(action, actorId, targetId, amount, note) {
  db.prepare(
    `INSERT INTO audit_log (action, actor_id, target_id, amount, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(action, actorId, targetId, amount ?? null, note ?? null, new Date().toISOString())
}

export function exportSnapshot() {
  const users = db.prepare('SELECT * FROM users ORDER BY total_allocated DESC').all()
  const locked = users.reduce((s, u) => s + u.locked, 0)
  const unlocked = users.reduce((s, u) => s + u.unlocked, 0)
  const claimed = users.reduce((s, u) => s + u.claimed, 0)
  const total = config.teamPoolTokens
  const pendingLockedRewards = locked

  const snapshot = {
    updatedAt: new Date().toISOString(),
    pool: {
      total,
      locked,
      unlocked,
      claimed,
      remaining: Math.max(0, total - locked - unlocked - claimed),
    },
    referral: {
      totalUsers: users.length,
      totalReferralClicks: users.reduce((s, u) => s + u.referral_clicks, 0),
      totalInviteRewards: users.reduce((s, u) => s + u.total_allocated, 0),
      pendingLockedRewards,
    },
    presale: getPresaleStats(),
    users: users.map((u) => ({
      discordId: u.discord_id,
      username: u.username,
      referralCode: u.referral_code,
      invitedBy: u.invited_by,
      totalAllocated: u.total_allocated,
      locked: u.locked,
      unlocked: u.unlocked,
      claimed: u.claimed,
      mcapUnlockedTiers: JSON.parse(u.mcap_unlocked_tiers || '[]'),
      discordInvites: u.discord_invites,
      telegramInvites: u.telegram_invites,
      referralClicks: u.referral_clicks,
      referredJoins: u.referred_joins,
      referredContributions: u.referred_contributions,
      walletAddress: u.wallet_address,
      discordInviteTrackingEnabled: Boolean(u.discord_invite_tracking_enabled),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
  }

  const json = JSON.stringify(snapshot, null, 2)
  mkdirSync(path.dirname(config.snapshotPath), { recursive: true })
  writeFileSync(config.snapshotPath, json)
  if (config.webSnapshotPath !== config.snapshotPath) {
    mkdirSync(path.dirname(config.webSnapshotPath), { recursive: true })
    writeFileSync(config.webSnapshotPath, json)
  }
  return snapshot
}

export function isOwner(userId) {
  return config.ownerIds.includes(userId)
}

export function getUserByDiscord(discordId) {
  return db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
}

export function getUserByCode(code) {
  return db.prepare('SELECT * FROM users WHERE referral_code = ?').get(code.toUpperCase())
}

export function recordClick(code) {
  const user = getUserByCode(code)
  if (!user) return null
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE users SET referral_clicks = referral_clicks + 1, updated_at = ? WHERE discord_id = ?',
  ).run(now, user.discord_id)
  grantLocked(user.discord_id, config.rewards.referralClick, 'referral_click')
  return user
}

export function enableDiscordInviteTracking(discordId, actorId) {
  const user = getUserByDiscord(discordId)
  if (!user) throw new Error('User not found')
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE users SET discord_invite_tracking_enabled = 1, updated_at = ? WHERE discord_id = ?',
  ).run(now, discordId)
  logAudit('discord_invite_tracking_on', actorId, discordId, null, 'enabled')
  exportSnapshot()
  return getUserByDiscord(discordId)
}

export function isDiscordInviteTrackingEnabled(discordId) {
  const user = getUserByDiscord(discordId)
  return Boolean(user?.discord_invite_tracking_enabled)
}

/** Credit inviter when a new member joins via their invite (tracking must be enabled). */
export function recordDiscordInviteJoin(inviterId, joinerId, joinerUsername) {
  ensureUser(joinerId, joinerUsername)
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE users SET discord_invites = discord_invites + 1, updated_at = ? WHERE discord_id = ?',
  ).run(now, inviterId)
  grantLocked(
    inviterId,
    config.rewards.discordInvite,
    `discord_invite_join:${joinerId}`,
  )
  logAudit(
    'discord_invite_join',
    joinerId,
    inviterId,
    config.rewards.discordInvite,
    joinerUsername,
  )
}

function mapPresaleRow(row) {
  if (!row) return null
  return {
    id: row.id,
    txHash: row.tx_hash,
    payerAddress: row.payer_address,
    receiveAddress: row.receive_address,
    ethAmount: row.eth_amount,
    ethUsd: row.eth_usd,
    tierId: row.tier_id,
    tierLabel: row.tier_label,
    tierPriceUsd: row.tier_price_usd,
    presaleDay: row.presale_day,
    tokensOwed: row.tokens_owed,
    tokensSent: row.tokens_sent,
    status: row.status,
    referralCode: row.referral_code,
    blockTimestamp: row.block_timestamp,
    createdAt: row.created_at,
    distributionTxHash: row.distribution_tx_hash,
  }
}

export function getPresaleByTxHash(txHash) {
  const row = db
    .prepare('SELECT * FROM presale_purchases WHERE tx_hash = ?')
    .get(txHash.toLowerCase())
  return mapPresaleRow(row)
}

export function getPresaleStats() {
  const agg = db
    .prepare(
      `SELECT
        COUNT(*) as contributors,
        COALESCE(SUM(CAST(eth_amount AS REAL)), 0) as total_eth,
        COALESCE(SUM(tokens_owed), 0) as tokens_allocated,
        COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) as contributors_sent
       FROM presale_purchases`,
    )
    .get()
  const cap = config.presaleTokenCap
  const tokensAllocated = agg.tokens_allocated ?? 0
  return {
    updatedAt: new Date().toISOString(),
    tokenCap: cap,
    tokensAllocated,
    tokensRemaining: Math.max(0, cap - tokensAllocated),
    totalEth: agg.total_eth ?? 0,
    contributors: agg.contributors ?? 0,
    contributorsSent: agg.contributors_sent ?? 0,
  }
}

export function registerPresalePurchase(record) {
  const existing = getPresaleByTxHash(record.txHash)
  if (existing) {
    return { duplicate: true, purchase: existing }
  }

  const stats = getPresaleStats()
  if (stats.tokensRemaining < record.tokensOwed) {
    throw new Error(
      `Presale cap reached — only ${stats.tokensRemaining.toLocaleString()} $EYES remaining`,
    )
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO presale_purchases (
      tx_hash, payer_address, receive_address, eth_amount, eth_usd,
      tier_id, tier_label, tier_price_usd, presale_day, tokens_owed,
      tokens_sent, status, referral_code, block_timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'verified', ?, ?, ?)`,
  ).run(
    record.txHash.toLowerCase(),
    record.payerAddress.toLowerCase(),
    record.receiveAddress.toLowerCase(),
    record.ethAmount,
    record.ethUsd,
    record.tierId,
    record.tierLabel,
    record.tierPriceUsd,
    record.presaleDay,
    record.tokensOwed,
    record.referralCode,
    record.blockTimestamp,
    now,
  )

  if (record.referralCode) {
    const referrer = getUserByCode(record.referralCode)
    if (referrer) {
      const ts = new Date().toISOString()
      db.prepare(
        'UPDATE users SET referred_contributions = referred_contributions + 1, updated_at = ? WHERE discord_id = ?',
      ).run(ts, referrer.discord_id)
      grantLocked(
        referrer.discord_id,
        config.rewards.referredContribution,
        `presale:${record.txHash}`,
      )
    }
  }

  logAudit(
    'presale_register',
    record.payerAddress,
    record.receiveAddress,
    record.tokensOwed,
    record.txHash,
  )
  exportSnapshot()
  return { duplicate: false, purchase: getPresaleByTxHash(record.txHash) }
}

export function listPendingPresalePurchases(limit = 10) {
  const rows = db
    .prepare(
      `SELECT * FROM presale_purchases
       WHERE status = 'verified'
         AND distribution_tx_hash IS NULL
         AND (tokens_sent IS NULL OR tokens_sent = 0)
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(limit)
  return rows.map(mapPresaleRow)
}

export function getPresaleById(id) {
  const row = db.prepare('SELECT * FROM presale_purchases WHERE id = ?').get(id)
  return mapPresaleRow(row)
}

/** Lock a row for outbound send — prevents double-send if !presalesend run twice. */
export function claimPresaleForSend(id) {
  const claim = db.transaction(() => {
    const row = db.prepare('SELECT * FROM presale_purchases WHERE id = ?').get(id)
    if (!row) return null
    if (row.status !== 'verified') return null
    if (row.distribution_tx_hash) return null
    if (row.tokens_sent && row.tokens_sent > 0) return null

    const result = db
      .prepare(
        `UPDATE presale_purchases SET status = 'sending'
         WHERE id = ?
           AND status = 'verified'
           AND distribution_tx_hash IS NULL
           AND (tokens_sent IS NULL OR tokens_sent = 0)`,
      )
      .run(id)
    if (result.changes !== 1) return null
    return mapPresaleRow(db.prepare('SELECT * FROM presale_purchases WHERE id = ?').get(id))
  })
  return claim()
}

export function releasePresaleSendClaim(id) {
  db.prepare(
    `UPDATE presale_purchases SET status = 'verified'
     WHERE id = ? AND status = 'sending' AND distribution_tx_hash IS NULL`,
  ).run(id)
}

export function markPresaleSent(id, { distributionTxHash, tokensSent }) {
  const result = db
    .prepare(
      `UPDATE presale_purchases SET
        status = 'sent',
        tokens_sent = ?,
        distribution_tx_hash = ?
       WHERE id = ?
         AND status IN ('verified', 'sending')
         AND distribution_tx_hash IS NULL`,
    )
    .run(tokensSent, distributionTxHash, id)

  const row = db.prepare('SELECT * FROM presale_purchases WHERE id = ?').get(id)
  if (result.changes === 1 && row) {
    logAudit(
      'presale_sent',
      row.receive_address,
      row.tx_hash,
      tokensSent,
      distributionTxHash,
    )
    exportSnapshot()
    return { updated: true, purchase: mapPresaleRow(row) }
  }
  return { updated: false, purchase: mapPresaleRow(row) }
}

export function markPresaleFailed(id, reason) {
  db.prepare(`UPDATE presale_purchases SET status = 'failed' WHERE id = ?`).run(id)
  logAudit('presale_send_failed', null, String(id), null, reason)
  exportSnapshot()
}

function mapTeamClaimRow(row) {
  if (!row) return null
  return {
    id: row.id,
    discordId: row.discord_id,
    receiveAddress: row.receive_address,
    tokensAmount: row.tokens_amount,
    status: row.status,
    distributionTxHash: row.distribution_tx_hash,
    createdAt: row.created_at,
  }
}

/** Queue unlocked team tokens for on-chain send via !presalesend. */
export function createTeamTokenClaim(discordId, amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  const claim = db.transaction(() => {
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId)
    if (!user) throw new Error('User not found — join the server first')
    if (!user.wallet_address?.startsWith('0x')) {
      throw new Error('Link wallet first: `!linkwallet`')
    }
    if (user.unlocked < amount) {
      throw new Error(
        `Insufficient unlocked balance — you have ${user.unlocked.toLocaleString()} $EYES available to claim`,
      )
    }

    const now = new Date().toISOString()
    const reserved = db
      .prepare(
        `UPDATE users SET unlocked = unlocked - ?, updated_at = ?
         WHERE discord_id = ? AND unlocked >= ?`,
      )
      .run(amount, now, discordId, amount)
    if (reserved.changes !== 1) {
      throw new Error('Could not reserve unlocked balance — try again')
    }

    const insert = db
      .prepare(
        `INSERT INTO team_token_claims (
          discord_id, receive_address, tokens_amount, status, created_at
        ) VALUES (?, ?, ?, 'verified', ?)`,
      )
      .run(discordId, user.wallet_address.toLowerCase(), amount, now)

    logAudit('team_claim_request', discordId, user.wallet_address, amount, `claim #${insert.lastInsertRowid}`)
    return mapTeamClaimRow(
      db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(insert.lastInsertRowid),
    )
  })()

  exportSnapshot()
  return claim
}

export function listPendingTeamClaims(limit = 10) {
  const rows = db
    .prepare(
      `SELECT * FROM team_token_claims
       WHERE status = 'verified' AND distribution_tx_hash IS NULL
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(limit)
  return rows.map(mapTeamClaimRow)
}

export function getPendingSendStats() {
  const presale = db
    .prepare(
      `SELECT COUNT(*) as n FROM presale_purchases
       WHERE status = 'verified' AND distribution_tx_hash IS NULL
         AND (tokens_sent IS NULL OR tokens_sent = 0)`,
    )
    .get().n
  const team = db
    .prepare(
      `SELECT COUNT(*) as n FROM team_token_claims
       WHERE status = 'verified' AND distribution_tx_hash IS NULL`,
    )
    .get().n
  return { presale, team, total: presale + team }
}

export function listPendingDistributions(limit = 10) {
  const presales = listPendingPresalePurchases(limit)
  const team = listPendingTeamClaims(limit)
  return [
    ...presales.map((p) => ({
      type: 'presale',
      id: p.id,
      receiveAddress: p.receiveAddress,
      tokensOwed: p.tokensOwed,
      createdAt: p.createdAt,
    })),
    ...team.map((t) => ({
      type: 'team',
      id: t.id,
      receiveAddress: t.receiveAddress,
      tokensOwed: t.tokensAmount,
      createdAt: t.createdAt,
      discordId: t.discordId,
    })),
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit)
}

export function claimTeamClaimForSend(id) {
  const claim = db.transaction(() => {
    const row = db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(id)
    if (!row) return null
    if (row.status !== 'verified') return null
    if (row.distribution_tx_hash) return null

    const result = db
      .prepare(
        `UPDATE team_token_claims SET status = 'sending'
         WHERE id = ? AND status = 'verified' AND distribution_tx_hash IS NULL`,
      )
      .run(id)
    if (result.changes !== 1) return null
    return mapTeamClaimRow(db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(id))
  })()
  return claim
}

export function releaseTeamClaimSendClaim(id) {
  db.prepare(
    `UPDATE team_token_claims SET status = 'verified'
     WHERE id = ? AND status = 'sending' AND distribution_tx_hash IS NULL`,
  ).run(id)
}

export function markTeamClaimSent(id, { distributionTxHash, tokensSent }) {
  const result = db.transaction(() => {
    const row = db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(id)
    if (!row) return { updated: false, claim: null }

    const updated = db
      .prepare(
        `UPDATE team_token_claims SET
          status = 'sent',
          distribution_tx_hash = ?
         WHERE id = ?
           AND status IN ('verified', 'sending')
           AND distribution_tx_hash IS NULL`,
      )
      .run(distributionTxHash, id)
    if (updated.changes !== 1) {
      return { updated: false, claim: mapTeamClaimRow(row) }
    }

    const now = new Date().toISOString()
    db.prepare(
      `UPDATE users SET claimed = claimed + ?, updated_at = ? WHERE discord_id = ?`,
    ).run(tokensSent, now, row.discord_id)

    logAudit(
      'team_claim_sent',
      row.discord_id,
      row.receive_address,
      tokensSent,
      distributionTxHash,
    )
    return {
      updated: true,
      claim: mapTeamClaimRow(db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(id)),
    }
  })()

  if (result.updated) exportSnapshot()
  return result
}

export function markTeamClaimFailed(id, reason) {
  db.transaction(() => {
    const row = db.prepare('SELECT * FROM team_token_claims WHERE id = ?').get(id)
    if (!row) return
    if (row.status === 'sent') return

    db.prepare(`UPDATE team_token_claims SET status = 'failed' WHERE id = ?`).run(id)
    if (row.status === 'verified' || row.status === 'sending') {
      const now = new Date().toISOString()
      db.prepare(
        `UPDATE users SET unlocked = unlocked + ?, updated_at = ? WHERE discord_id = ?`,
      ).run(row.tokens_amount, now, row.discord_id)
    }
    logAudit('team_claim_failed', row.discord_id, String(id), row.tokens_amount, reason)
  })()
  exportSnapshot()
}

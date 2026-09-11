import Database from 'better-sqlite3'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  token: process.env.DISCORD_BOT_TOKEN ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
  ownerIds: (process.env.DISCORD_OWNER_IDS ?? '').split(',').filter(Boolean),
  staffLogChannelId: process.env.DISCORD_STAFF_LOG_CHANNEL_ID ?? '',
  launchesChannelId: process.env.DISCORD_LAUNCHES_CHANNEL_ID ?? '',
  siteUrl: process.env.SITE_URL ?? 'https://www.eyesopen.to',
  snapshotPath:
    process.env.SNAPSHOT_PATH ??
    path.join(__dirname, '../../../data/platform-snapshot.json'),
  webSnapshotPath:
    process.env.WEB_SNAPSHOT_PATH ??
    path.join(__dirname, '../../../web/data/platform-snapshot.json'),
  dbPath: process.env.DB_PATH ?? path.join(__dirname, '../data/platform.db'),
  teamPoolTokens: Number(process.env.TEAM_POOL_TOKENS ?? '100000000'),
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
  CREATE TABLE IF NOT EXISTS app_accounts (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    image TEXT,
    wallet_address TEXT,
    discord_id TEXT,
    email_launches INTEGER DEFAULT 1,
    email_presale INTEGER DEFAULT 1,
    email_season INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_app_accounts_wallet ON app_accounts(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_app_accounts_discord ON app_accounts(discord_id);
`)

function migrateDb() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
  if (!cols.includes('discord_invite_tracking_enabled')) {
    db.exec(
      'ALTER TABLE users ADD COLUMN discord_invite_tracking_enabled INTEGER DEFAULT 0',
    )
  }
}

function migrateWalletFeatures() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_link_codes (
      code TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      discord_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_link_wallet ON wallet_link_codes(wallet_address);
    CREATE TABLE IF NOT EXISTS discord_token_sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      actor_id TEXT NOT NULL,
      note TEXT,
      tx_hash TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_discord_sends_status ON discord_token_sends(status);
  `)
}

function migrateEyesAccountAuth() {
  const cols = db.prepare('PRAGMA table_info(app_accounts)').all().map((c) => c.name)
  const addCol = (name, ddl) => {
    if (!cols.includes(name)) db.exec(`ALTER TABLE app_accounts ADD COLUMN ${ddl}`)
  }
  addCol('password_hash', 'password_hash TEXT')
  addCol('wallet_enc_salt', 'wallet_enc_salt TEXT')
  addCol('wallet_enc_iv', 'wallet_enc_iv TEXT')
  addCol('wallet_enc_ciphertext', 'wallet_enc_ciphertext TEXT')
  addCol('wallet_enc_version', 'wallet_enc_version INTEGER DEFAULT 1')
  addCol('solana_address', 'solana_address TEXT')
}

function migrateLaunchMetadata() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS launch_metadata (
      launch_id INTEGER PRIMARY KEY,
      token_address TEXT NOT NULL UNIQUE,
      pair_address TEXT,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      description TEXT,
      website TEXT,
      twitter TEXT,
      telegram TEXT,
      creator TEXT NOT NULL,
      deploy_tx_hash TEXT,
      seed_tx_hash TEXT,
      fomo_url TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_launch_metadata_token ON launch_metadata(token_address);
  `)
  const cols = db.prepare('PRAGMA table_info(launch_metadata)').all()
  const hasChainKey = cols.some((c) => c.name === 'chain_key')
  if (!hasChainKey) {
    db.exec(`ALTER TABLE launch_metadata ADD COLUMN chain_key TEXT NOT NULL DEFAULT 'base'`)
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_launch_metadata_chain ON launch_metadata(chain_key)`)
}

function migrateBoostNotifications() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boost_notifications (
      tx_hash TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      launch_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

function migrateAccountSettings() {
  const cols = db.prepare('PRAGMA table_info(app_accounts)').all().map((c) => c.name)
  const addCol = (name, ddl) => {
    if (!cols.includes(name)) db.exec(`ALTER TABLE app_accounts ADD COLUMN ${ddl}`)
  }
  addCol('default_launch_chain', "default_launch_chain TEXT DEFAULT 'base'")
  addCol('launch_webhook_url', 'launch_webhook_url TEXT')
  addCol('launch_webhook_secret', 'launch_webhook_secret TEXT')
  addCol('public_creator_profile', 'public_creator_profile INTEGER DEFAULT 1')
  addCol('webhook_filter_chains', 'webhook_filter_chains TEXT')
  addCol('webhook_only_mine', 'webhook_only_mine INTEGER DEFAULT 0')
  addCol('webhook_events', 'webhook_events TEXT')
  addCol('wallet_auto_lock_minutes', 'wallet_auto_lock_minutes INTEGER DEFAULT 15')
  addCol('discord_dm_launches', 'discord_dm_launches INTEGER DEFAULT 0')
  addCol('discord_dm_presale', 'discord_dm_presale INTEGER DEFAULT 0')
  addCol('discord_dm_season', 'discord_dm_season INTEGER DEFAULT 0')
}

function migrateApiKeys() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT NOT NULL DEFAULT 'launches:read',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
  `)
  const cols = db.prepare('PRAGMA table_info(api_keys)').all().map((c) => c.name)
  const addCol = (name, ddl) => {
    if (!cols.includes(name)) db.exec(`ALTER TABLE api_keys ADD COLUMN ${ddl}`)
  }
  addCol('tier', "tier TEXT DEFAULT 'free'")
  addCol('kind', "kind TEXT DEFAULT 'personal'")
  addCol('team_id', 'team_id TEXT')
  addCol('requests_today', 'requests_today INTEGER DEFAULT 0')
  addCol('requests_day_key', 'requests_day_key TEXT')
  addCol('overage_tokens_burned', 'overage_tokens_burned INTEGER DEFAULT 0')
}

function migrateApiUsage() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage_daily (
      key_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (key_id, day)
    );
    CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage_daily(key_id);
  `)
}

function migratePasswordReset() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email);
  `)
}

function migrateOAuthApps() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_apps (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      client_id TEXT NOT NULL UNIQUE,
      client_secret_hash TEXT NOT NULL,
      client_prefix TEXT NOT NULL,
      redirect_uris TEXT NOT NULL,
      scopes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code_hash TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      scopes TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_apps_account ON oauth_apps(account_id);
  `)
}

migrateDb()
migrateWalletFeatures()
migrateEyesAccountAuth()
migrateLaunchMetadata()
migrateBoostNotifications()
migrateAccountSettings()
migrateApiKeys()
migrateApiUsage()
migratePasswordReset()
migrateOAuthApps()

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

/** All presale rows for a wallet (payer or receive address). */
export function getPresalePurchasesByWallet(wallet) {
  const addr = wallet.trim().toLowerCase()
  if (!addr.startsWith('0x') || addr.length < 10) return []
  const rows = db
    .prepare(
      `SELECT * FROM presale_purchases
       WHERE LOWER(receive_address) = ? OR LOWER(payer_address) = ?
       ORDER BY created_at DESC
       LIMIT 10`,
    )
    .all(addr, addr)
  return rows.map(mapPresaleRow)
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

function mapAppAccountRow(row) {
  if (!row) return null
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    image: row.image,
    walletAddress: row.wallet_address,
    solanaAddress: row.solana_address ?? null,
    discordId: row.discord_id,
    emailAlerts: {
      launches: Boolean(row.email_launches),
      presale: Boolean(row.email_presale),
      season: Boolean(row.email_season),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function upsertAppAccount({ googleId, email, name, image }) {
  const now = new Date().toISOString()
  const existing = db
    .prepare('SELECT * FROM app_accounts WHERE google_id = ?')
    .get(googleId)

  if (existing) {
    db.prepare(
      `UPDATE app_accounts SET email = ?, name = ?, image = ?, updated_at = ? WHERE google_id = ?`,
    ).run(email.toLowerCase(), name, image, now, googleId)
    logAudit('account_upsert', googleId, email, null, 'update')
    return mapAppAccountRow(
      db.prepare('SELECT * FROM app_accounts WHERE google_id = ?').get(googleId),
    )
  }

  const byEmail = db
    .prepare('SELECT * FROM app_accounts WHERE email = ?')
    .get(email.toLowerCase())
  if (byEmail) {
    db.prepare(
      `UPDATE app_accounts SET google_id = ?, name = ?, image = ?, updated_at = ? WHERE email = ?`,
    ).run(googleId, name, image, now, email.toLowerCase())
    logAudit('account_upsert', googleId, email, null, 'email_merge')
    return mapAppAccountRow(
      db.prepare('SELECT * FROM app_accounts WHERE google_id = ?').get(googleId),
    )
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO app_accounts (
      id, google_id, email, name, image, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, googleId, email.toLowerCase(), name, image, now, now)
  logAudit('account_upsert', googleId, email, null, 'create')
  return mapAppAccountRow(db.prepare('SELECT * FROM app_accounts WHERE google_id = ?').get(googleId))
}

export function getAppAccountByGoogleId(googleId) {
  return mapAppAccountRow(
    db.prepare('SELECT * FROM app_accounts WHERE google_id = ?').get(googleId),
  )
}

export function getAppAccountByEmail(email) {
  return mapAppAccountRow(
    db.prepare('SELECT * FROM app_accounts WHERE email = ?').get(email.toLowerCase()),
  )
}

export function subscribeEmailAccount(email) {
  const normalized = email.toLowerCase()
  const existing = getAppAccountByEmail(normalized)
  if (existing) return existing

  const now = new Date().toISOString()
  const id = randomUUID()
  db.prepare(
    `INSERT INTO app_accounts (
      id, google_id, email, name, image, created_at, updated_at
    ) VALUES (?, NULL, ?, NULL, NULL, ?, ?)`,
  ).run(id, normalized, now, now)
  logAudit('account_subscribe', normalized, null, null, 'email_only')
  return getAppAccountByEmail(normalized)
}

export function linkAppAccount({ googleId, email, wallet, discordId }) {
  const account = googleId
    ? getAppAccountByGoogleId(googleId)
    : email
      ? getAppAccountByEmail(email)
      : null
  if (!account) throw new Error('Account not found')

  const now = new Date().toISOString()
  const walletNorm = wallet ? wallet.toLowerCase() : account.walletAddress
  const discordNorm = discordId ?? account.discordId

  db.prepare(
    `UPDATE app_accounts SET wallet_address = ?, discord_id = ?, updated_at = ? WHERE id = ?`,
  ).run(walletNorm, discordNorm, now, account.id)

  if (walletNorm && discordNorm) {
    const teamUser = getUserByDiscord(discordNorm)
    if (teamUser && !teamUser.wallet_address) {
      db.prepare(
        'UPDATE users SET wallet_address = ?, updated_at = ? WHERE discord_id = ?',
      ).run(walletNorm, now, discordNorm)
      exportSnapshot()
    }
  }

  if (walletNorm && !discordNorm) {
    const byWallet = db
      .prepare('SELECT * FROM users WHERE wallet_address = ?')
      .get(walletNorm)
    if (byWallet) {
      db.prepare(
        'UPDATE app_accounts SET discord_id = ?, updated_at = ? WHERE id = ?',
      ).run(byWallet.discord_id, now, account.id)
    }
  }

  logAudit('account_link', account.googleId ?? account.email, walletNorm, null, discordNorm)
  return googleId
    ? getAppAccountByGoogleId(googleId)
    : getAppAccountByEmail(account.email)
}

export function updateAppAccountPreferences(identity, emailAlerts) {
  const account = identity.googleId
    ? getAppAccountByGoogleId(identity.googleId)
    : identity.email
      ? getAppAccountByEmail(identity.email)
      : null
  if (!account) throw new Error('Account not found')
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE app_accounts SET
      email_launches = ?,
      email_presale = ?,
      email_season = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    emailAlerts.launches ? 1 : 0,
    emailAlerts.presale ? 1 : 0,
    emailAlerts.season ? 1 : 0,
    now,
    account.id,
  )
  logAudit(
    'account_prefs',
    account.googleId ?? account.email,
    null,
    null,
    JSON.stringify(emailAlerts),
  )
  return identity.googleId
    ? getAppAccountByGoogleId(identity.googleId)
    : getAppAccountByEmail(account.email)
}

export function getAppAccountProfile(identity) {
  const account = identity.googleId
    ? getAppAccountByGoogleId(identity.googleId)
    : identity.email
      ? getAppAccountByEmail(identity.email)
      : identity.accountId
        ? getAppAccountById(identity.accountId)
        : null
  if (!account) return null

  let presaleContributions = 0
  if (account.walletAddress) {
    presaleContributions = db
      .prepare(
        `SELECT COUNT(*) as n FROM presale_purchases
         WHERE LOWER(payer_address) = ? OR LOWER(receive_address) = ?`,
      )
      .get(account.walletAddress, account.walletAddress)?.n ?? 0
  }

  const teamPoolUser = account.discordId
    ? Boolean(getUserByDiscord(account.discordId))
    : false

  return {
    account,
    links: {
      walletLinked: Boolean(account.walletAddress),
      discordLinked: Boolean(account.discordId),
      presaleContributions,
      teamPoolUser,
      seasonPoints: null,
    },
  }
}

export function listAppAccountsForEmailDigest(type = 'launches') {
  const col =
    type === 'presale' ? 'email_presale' : type === 'season' ? 'email_season' : 'email_launches'
  const rows = db.prepare(`SELECT * FROM app_accounts WHERE ${col} = 1`).all()
  return rows.map(mapAppAccountRow)
}

function mapAppAccountAuthRow(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash ?? null,
    walletAddress: row.wallet_address ?? null,
    solanaAddress: row.solana_address ?? null,
    walletEnc:
      row.wallet_enc_salt && row.wallet_enc_iv && row.wallet_enc_ciphertext
        ? {
            v: row.wallet_enc_version ?? 1,
            address: row.wallet_address,
            saltB64: row.wallet_enc_salt,
            ivB64: row.wallet_enc_iv,
            ciphertextB64: row.wallet_enc_ciphertext,
            createdAt: row.updated_at ?? row.created_at,
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAppAccountById(id) {
  return mapAppAccountRow(db.prepare('SELECT * FROM app_accounts WHERE id = ?').get(id))
}

export function getEyesAccountAuthByEmail(email) {
  const row = db.prepare('SELECT * FROM app_accounts WHERE email = ?').get(email.toLowerCase())
  return mapAppAccountAuthRow(row)
}

export function createEyesAccount({
  email,
  passwordHash,
  walletAddress,
  walletEncSalt,
  walletEncIv,
  walletEncCiphertext,
  solanaAddress,
}) {
  const normalized = email.toLowerCase()
  const existing = db.prepare('SELECT * FROM app_accounts WHERE email = ?').get(normalized)
  if (existing?.password_hash) throw new Error('Email already registered')

  const now = new Date().toISOString()
  const walletNorm = walletAddress?.toLowerCase() ?? null
  const solNorm = solanaAddress?.trim() || null

  if (existing) {
    db.prepare(
      `UPDATE app_accounts SET
        password_hash = ?,
        wallet_address = ?,
        solana_address = COALESCE(?, solana_address),
        wallet_enc_salt = ?,
        wallet_enc_iv = ?,
        wallet_enc_ciphertext = ?,
        wallet_enc_version = 1,
        updated_at = ?
       WHERE email = ?`,
    ).run(
      passwordHash,
      walletNorm,
      solNorm,
      walletEncSalt,
      walletEncIv,
      walletEncCiphertext,
      now,
      normalized,
    )
    logAudit('eyes_account_create', normalized, walletNorm, null, 'upgrade_email_only')
    exportSnapshot()
    return getEyesAccountAuthByEmail(normalized)
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO app_accounts (
      id, email, password_hash, wallet_address, solana_address,
      wallet_enc_salt, wallet_enc_iv, wallet_enc_ciphertext, wallet_enc_version,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    id,
    normalized,
    passwordHash,
    walletNorm,
    solNorm,
    walletEncSalt,
    walletEncIv,
    walletEncCiphertext,
    now,
    now,
  )
  logAudit('eyes_account_create', normalized, walletNorm, null, 'new')
  exportSnapshot()
  return getEyesAccountAuthByEmail(normalized)
}

export function updateEyesAccountSolanaAddress(email, solanaAddress, { onlyIfMissing = true } = {}) {
  const normalized = email.toLowerCase()
  const solNorm = solanaAddress?.trim()
  if (!solNorm) throw new Error('solanaAddress required')

  const row = db.prepare('SELECT id, solana_address FROM app_accounts WHERE email = ?').get(normalized)
  if (!row) throw new Error('Account not found')
  if (onlyIfMissing && row.solana_address) return getEyesAccountAuthByEmail(normalized)

  const now = new Date().toISOString()
  db.prepare('UPDATE app_accounts SET solana_address = ?, updated_at = ? WHERE email = ?').run(
    solNorm,
    now,
    normalized,
  )
  logAudit('eyes_account_solana', normalized, null, null, onlyIfMissing ? 'backfill' : 'verify')
  exportSnapshot()
  return getEyesAccountAuthByEmail(normalized)
}

function mapLaunchMetadataRow(row) {
  if (!row) return null
  return {
    launchId: row.launch_id,
    chainKey: row.chain_key ?? 'base',
    tokenAddress: row.token_address,
    pairAddress: row.pair_address ?? null,
    name: row.name,
    symbol: row.symbol,
    description: row.description ?? undefined,
    website: row.website ?? undefined,
    twitter: row.twitter ?? undefined,
    telegram: row.telegram ?? undefined,
    creator: row.creator,
    deployTxHash: row.deploy_tx_hash ?? undefined,
    seedTxHash: row.seed_tx_hash ?? undefined,
    fomoUrl: row.fomo_url,
    registeredAt: row.registered_at,
  }
}

export function registerLaunchMetadata(input) {
  const now = new Date().toISOString()
  const chainKey = input.chainKey ?? 'base'
  const token =
    chainKey === 'solana'
      ? String(input.tokenAddress ?? '').trim()
      : String(input.tokenAddress ?? '').toLowerCase()
  const creator =
    chainKey === 'solana'
      ? String(input.creator ?? '').trim()
      : String(input.creator ?? '').toLowerCase()
  if (!token || !creator || !input.name || !input.symbol || !input.fomoUrl) {
    throw new Error('launch metadata fields incomplete')
  }

  db.prepare(
    `INSERT INTO launch_metadata (
      launch_id, chain_key, token_address, pair_address, name, symbol, description,
      website, twitter, telegram, creator, deploy_tx_hash, seed_tx_hash,
      fomo_url, registered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token_address) DO UPDATE SET
      launch_id = excluded.launch_id,
      chain_key = excluded.chain_key,
      token_address = excluded.token_address,
      pair_address = excluded.pair_address,
      name = excluded.name,
      symbol = excluded.symbol,
      description = excluded.description,
      website = excluded.website,
      twitter = excluded.twitter,
      telegram = excluded.telegram,
      creator = excluded.creator,
      deploy_tx_hash = excluded.deploy_tx_hash,
      seed_tx_hash = excluded.seed_tx_hash,
      fomo_url = excluded.fomo_url,
      registered_at = excluded.registered_at`,
  ).run(
    input.launchId,
    chainKey,
    token,
    chainKey === 'solana'
      ? input.pairAddress?.trim() ?? null
      : input.pairAddress?.toLowerCase() ?? null,
    input.name,
    input.symbol,
    input.description ?? null,
    input.website ?? null,
    input.twitter ?? null,
    input.telegram ?? null,
    creator,
    input.deployTxHash ?? null,
    input.seedTxHash ?? null,
    input.fomoUrl,
    now,
  )

  logAudit('launch_register', String(input.launchId), token, null, `${chainKey}:${input.symbol}`)
  exportSnapshot()
  const tokenLookup =
    chainKey === 'solana'
      ? String(input.tokenAddress ?? '').trim()
      : String(input.tokenAddress ?? '').toLowerCase()
  return mapLaunchMetadataRow(
    db.prepare('SELECT * FROM launch_metadata WHERE token_address = ?').get(tokenLookup),
  )
}

export function listLaunchMetadata() {
  const rows = db.prepare('SELECT * FROM launch_metadata ORDER BY launch_id DESC').all()
  return rows.map(mapLaunchMetadataRow).filter(Boolean)
}

export function hasBoostNotification(txHash) {
  if (!txHash) return false
  const row = db
    .prepare('SELECT tx_hash FROM boost_notifications WHERE tx_hash = ?')
    .get(String(txHash).toLowerCase())
  return Boolean(row)
}

export function recordBoostNotification({ txHash, packageId, launchId }) {
  const hash = String(txHash).toLowerCase()
  db.prepare(
    'INSERT OR IGNORE INTO boost_notifications (tx_hash, package_id, launch_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(hash, packageId, launchId, new Date().toISOString())
  logAudit('boost_notify', launchId, hash, null, packageId)
}

function mapAccountSettingsRow(row) {
  if (!row) return null
  const chains = (row.webhook_filter_chains ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  const events = (row.webhook_events ?? 'launch.created,launch.discovery_registered')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  return {
    defaultLaunchChain: row.default_launch_chain ?? 'base',
    launchWebhookUrl: row.launch_webhook_url ?? null,
    launchWebhookSecret: row.launch_webhook_secret ?? null,
    publicCreatorProfile: row.public_creator_profile !== 0,
    webhookFilterChains: chains,
    webhookOnlyMine: row.webhook_only_mine === 1,
    webhookEvents: events.length ? events : ['launch.created', 'launch.discovery_registered'],
    walletAutoLockMinutes: row.wallet_auto_lock_minutes ?? 15,
    discordDmLaunches: row.discord_dm_launches === 1,
    discordDmPresale: row.discord_dm_presale === 1,
    discordDmSeason: row.discord_dm_season === 1,
  }
}

function mapApiKeyRow(row) {
  if (!row) return null
  return {
    id: row.id,
    accountId: row.account_id,
    email: row.email,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes.split(',').filter(Boolean),
    tier: row.tier ?? 'free',
    kind: row.kind ?? 'personal',
    teamId: row.team_id ?? null,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? null,
    revokedAt: row.revoked_at ?? null,
  }
}

const TIER_DAILY_LIMITS = { free: 2000, pro: 50000, team: 10000 }

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function incrementApiKeyUsage(keyId) {
  const day = todayKey()
  db.prepare(
    `INSERT INTO api_usage_daily (key_id, day, count) VALUES (?, ?, 1)
     ON CONFLICT(key_id, day) DO UPDATE SET count = count + 1`,
  ).run(keyId, day)
  const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId)
  if (!row) return
  const dayKey = row.requests_day_key
  if (dayKey === day) {
    db.prepare('UPDATE api_keys SET requests_today = requests_today + 1, last_used_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      keyId,
    )
  } else {
    db.prepare(
      'UPDATE api_keys SET requests_today = 1, requests_day_key = ?, last_used_at = ? WHERE id = ?',
    ).run(day, new Date().toISOString(), keyId)
  }
}

export function changeEyesAccountPassword({
  email,
  passwordHash,
  walletEncSalt,
  walletEncIv,
  walletEncCiphertext,
}) {
  const normalized = email.toLowerCase()
  const row = db.prepare('SELECT id FROM app_accounts WHERE email = ?').get(normalized)
  if (!row?.id) throw new Error('Account not found')
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE app_accounts SET
      password_hash = ?,
      wallet_enc_salt = ?,
      wallet_enc_iv = ?,
      wallet_enc_ciphertext = ?,
      wallet_enc_version = 1,
      updated_at = ?
     WHERE email = ?`,
  ).run(passwordHash, walletEncSalt, walletEncIv, walletEncCiphertext, now, normalized)
  logAudit('eyes_account_password', normalized, null, null, 'changed')
  exportSnapshot()
  return getEyesAccountAuthByEmail(normalized)
}

export function getAccountSettings(email) {
  const row = db.prepare('SELECT * FROM app_accounts WHERE email = ?').get(email.toLowerCase())
  if (!row) throw new Error('Account not found')
  return mapAccountSettingsRow(row)
}

export function updateAccountSettings(email, input) {
  const normalized = email.toLowerCase()
  const row = db.prepare('SELECT id FROM app_accounts WHERE email = ?').get(normalized)
  if (!row?.id) throw new Error('Account not found')
  const now = new Date().toISOString()
  const chains = Array.isArray(input.webhookFilterChains)
    ? input.webhookFilterChains.join(',')
    : null
  const events = Array.isArray(input.webhookEvents) ? input.webhookEvents.join(',') : null
  db.prepare(
    `UPDATE app_accounts SET
      default_launch_chain = COALESCE(?, default_launch_chain),
      launch_webhook_url = ?,
      launch_webhook_secret = ?,
      public_creator_profile = COALESCE(?, public_creator_profile),
      webhook_filter_chains = COALESCE(?, webhook_filter_chains),
      webhook_only_mine = COALESCE(?, webhook_only_mine),
      webhook_events = COALESCE(?, webhook_events),
      wallet_auto_lock_minutes = COALESCE(?, wallet_auto_lock_minutes),
      discord_dm_launches = COALESCE(?, discord_dm_launches),
      discord_dm_presale = COALESCE(?, discord_dm_presale),
      discord_dm_season = COALESCE(?, discord_dm_season),
      updated_at = ?
     WHERE email = ?`,
  ).run(
    input.defaultLaunchChain ?? null,
    input.launchWebhookUrl ?? null,
    input.launchWebhookSecret ?? null,
    input.publicCreatorProfile === undefined ? null : input.publicCreatorProfile ? 1 : 0,
    chains,
    input.webhookOnlyMine === undefined ? null : input.webhookOnlyMine ? 1 : 0,
    events,
    input.walletAutoLockMinutes ?? null,
    input.discordDmLaunches === undefined ? null : input.discordDmLaunches ? 1 : 0,
    input.discordDmPresale === undefined ? null : input.discordDmPresale ? 1 : 0,
    input.discordDmSeason === undefined ? null : input.discordDmSeason ? 1 : 0,
    now,
    normalized,
  )
  logAudit('account_settings', normalized, null, null, 'update')
  exportSnapshot()
  return getAccountSettings(normalized)
}

export function createApiKey({
  accountId,
  email,
  name,
  keyHash,
  keyPrefix,
  scopes,
  tier,
  kind,
  teamId,
}) {
  const id = randomUUID()
  const now = new Date().toISOString()
  const scopeStr = Array.isArray(scopes) ? scopes.join(',') : String(scopes ?? 'launches:read')
  const keyTier = tier ?? (kind === 'team' ? 'team' : 'free')
  const keyKind = kind ?? 'personal'
  db.prepare(
    `INSERT INTO api_keys (id, account_id, email, name, key_prefix, key_hash, scopes, tier, kind, team_id, created_at, requests_today, requests_day_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    accountId,
    email.toLowerCase(),
    name,
    keyPrefix,
    keyHash,
    scopeStr,
    keyTier,
    keyKind,
    teamId ?? null,
    now,
    todayKey(),
  )
  logAudit('api_key_create', email.toLowerCase(), keyPrefix, null, name)
  exportSnapshot()
  return mapApiKeyRow(db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id))
}

export function listApiKeys(accountId) {
  const rows = db
    .prepare(
      `SELECT * FROM api_keys WHERE account_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
    )
    .all(accountId)
  return rows.map(mapApiKeyRow).filter(Boolean)
}

export function revokeApiKey({ accountId, keyId }) {
  const row = db.prepare('SELECT * FROM api_keys WHERE id = ? AND account_id = ?').get(keyId, accountId)
  if (!row) throw new Error('API key not found')
  const now = new Date().toISOString()
  db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(now, keyId)
  logAudit('api_key_revoke', row.email, row.key_prefix, null, keyId)
  exportSnapshot()
  return mapApiKeyRow({ ...row, revoked_at: now })
}

export function getApiKeyAuth(keyHash) {
  const row = db
    .prepare(`SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`)
    .get(keyHash)
  if (!row) return null
  incrementApiKeyUsage(row.id)
  return mapApiKeyRow(db.prepare('SELECT * FROM api_keys WHERE id = ?').get(row.id))
}

export function getApiKeyUsage(accountId, keyId) {
  const row = db.prepare('SELECT * FROM api_keys WHERE id = ? AND account_id = ?').get(keyId, accountId)
  if (!row) throw new Error('API key not found')
  const tier = row.tier ?? 'free'
  const dailyLimit = TIER_DAILY_LIMITS[tier] ?? TIER_DAILY_LIMITS.free
  const day = todayKey()
  const requestsToday =
    row.requests_day_key === day ? row.requests_today ?? 0 : 0
  const history = db
    .prepare(
      `SELECT day, count FROM api_usage_daily WHERE key_id = ? ORDER BY day DESC LIMIT 14`,
    )
    .all(keyId)
    .map((r) => ({ day: r.day, count: r.count }))
  return {
    keyId,
    tier,
    dailyLimit,
    requestsToday,
    overageTokensBurned: row.overage_tokens_burned ?? 0,
    history,
  }
}

export function listApiKeyUsage(accountId) {
  const keys = listApiKeys(accountId)
  return keys.map((k) => getApiKeyUsage(accountId, k.id))
}

export function createPasswordResetToken(email) {
  const normalized = email.toLowerCase()
  const row = db.prepare('SELECT id FROM app_accounts WHERE email = ?').get(normalized)
  if (!row?.id) throw new Error('Account not found')
  const raw = randomUUID() + randomUUID()
  const tokenHash = createHash('sha256').update(raw).digest('hex')
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO password_reset_tokens (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(tokenHash, normalized, expires, now)
  exportSnapshot()
  return { token: raw, expiresAt: expires }
}

export function consumePasswordResetToken(rawToken, passwordHash) {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token_hash = ?').get(tokenHash)
  if (!row || row.used_at) throw new Error('Invalid or expired reset link')
  if (row.expires_at < new Date().toISOString()) throw new Error('Reset link expired')
  const now = new Date().toISOString()
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?').run(now, tokenHash)
  db.prepare(
    `UPDATE app_accounts SET password_hash = ?, wallet_enc_salt = NULL, wallet_enc_iv = NULL,
     wallet_enc_ciphertext = NULL, updated_at = ? WHERE email = ?`,
  ).run(passwordHash, now, row.email)
  logAudit('eyes_account_password', row.email, null, null, 'reset')
  exportSnapshot()
  return row.email
}

export function exportAccountData(email) {
  const normalized = email.toLowerCase()
  const account = mapAppAccountRow(db.prepare('SELECT * FROM app_accounts WHERE email = ?').get(normalized))
  if (!account) throw new Error('Account not found')
  const settings = getAccountSettings(normalized)
  const keys = listApiKeys(account.id).map(({ keyPrefix, name, scopes, tier, kind, createdAt, lastUsedAt }) => ({
    keyPrefix,
    name,
    scopes,
    tier,
    kind,
    createdAt,
    lastUsedAt,
  }))
  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      email: account.email,
      walletAddress: account.walletAddress,
      solanaAddress: account.solanaAddress,
      createdAt: account.createdAt,
    },
    settings,
    apiKeys: keys,
  }
}

export function deleteAccount(email) {
  const normalized = email.toLowerCase()
  const row = db.prepare('SELECT id FROM app_accounts WHERE email = ?').get(normalized)
  if (!row?.id) throw new Error('Account not found')
  db.prepare('UPDATE api_keys SET revoked_at = ? WHERE account_id = ?').run(
    new Date().toISOString(),
    row.id,
  )
  db.prepare(
    `UPDATE app_accounts SET
      password_hash = NULL,
      wallet_address = NULL,
      solana_address = NULL,
      wallet_enc_salt = NULL,
      wallet_enc_iv = NULL,
      wallet_enc_ciphertext = NULL,
      email = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(`deleted+${row.id}@eyesopen.invalid`, new Date().toISOString(), row.id)
  logAudit('account_delete', normalized, row.id, null, 'scrubbed')
  exportSnapshot()
  return { ok: true }
}

export function createOAuthApp({ accountId, name, clientId, clientSecretHash, clientPrefix, redirectUris, scopes }) {
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO oauth_apps (id, account_id, name, client_id, client_secret_hash, client_prefix, redirect_uris, scopes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    accountId,
    name,
    clientId,
    clientSecretHash,
    clientPrefix,
    JSON.stringify(redirectUris),
    scopes.join(','),
    now,
  )
  exportSnapshot()
  return mapOAuthAppRow(db.prepare('SELECT * FROM oauth_apps WHERE id = ?').get(id))
}

function mapOAuthAppRow(row) {
  if (!row) return null
  let redirectUris = []
  try {
    redirectUris = JSON.parse(row.redirect_uris)
  } catch {
    redirectUris = []
  }
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    clientId: row.client_id,
    clientPrefix: row.client_prefix,
    redirectUris,
    scopes: row.scopes.split(',').filter(Boolean),
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
  }
}

export function listOAuthApps(accountId) {
  return db
    .prepare('SELECT * FROM oauth_apps WHERE account_id = ? AND revoked_at IS NULL ORDER BY created_at DESC')
    .all(accountId)
    .map(mapOAuthAppRow)
    .filter(Boolean)
}

export function getOAuthAppByClientId(clientId) {
  return mapOAuthAppRow(
    db.prepare('SELECT * FROM oauth_apps WHERE client_id = ? AND revoked_at IS NULL').get(clientId),
  )
}

export function createOAuthCode({ appId, accountId, redirectUri, scopes }) {
  const raw = randomUUID()
  const codeHash = createHash('sha256').update(raw).digest('hex')
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  db.prepare(
    `INSERT INTO oauth_codes (code_hash, app_id, account_id, redirect_uri, scopes, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(codeHash, appId, accountId, redirectUri, scopes.join(','), expires, now)
  return raw
}

export function exchangeOAuthCode({ rawCode, clientId, clientSecretHash, redirectUri }) {
  const app = getOAuthAppByClientId(clientId)
  if (!app || app.clientPrefix !== clientId.slice(0, 12)) {
    throw new Error('Invalid client')
  }
  const appRow = db.prepare('SELECT client_secret_hash FROM oauth_apps WHERE client_id = ?').get(clientId)
  if (!appRow || appRow.client_secret_hash !== clientSecretHash) throw new Error('Invalid client secret')
  const codeHash = createHash('sha256').update(rawCode).digest('hex')
  const row = db.prepare('SELECT * FROM oauth_codes WHERE code_hash = ?').get(codeHash)
  if (!row || row.used_at || row.expires_at < new Date().toISOString()) {
    throw new Error('Invalid or expired code')
  }
  if (row.redirect_uri !== redirectUri) throw new Error('Redirect URI mismatch')
  db.prepare('UPDATE oauth_codes SET used_at = ? WHERE code_hash = ?').run(new Date().toISOString(), codeHash)
  const account = getAppAccountById(row.account_id)
  if (!account?.email) throw new Error('Account not found')
  const rawKey = `eok_oauth_${randomBytes(32).toString('base64url')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 20)
  const record = createApiKey({
    accountId: row.account_id,
    email: account.email,
    name: `OAuth · ${app.name}`,
    keyHash,
    keyPrefix,
    scopes: row.scopes.split(',').filter(Boolean),
    tier: 'free',
    kind: 'personal',
  })
  return { accessToken: rawKey, tokenType: 'Bearer', scopes: row.scopes.split(','), key: record }
}

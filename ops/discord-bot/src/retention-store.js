import { randomUUID } from 'node:crypto'
import { db } from './db.js'

const SEASON_MAX_POINTS_PER_DAY = Number(process.env.SEASON_MAX_POINTS_PER_DAY ?? '5000')
const BOOST_POINT_WEIGHT = Number(process.env.BOOST_POINT_WEIGHT ?? '0.05')
const LAUNCH_FEE_POINTS = Number(process.env.LAUNCH_FEE_POINTS ?? '100')

export function migrateRetentionLedger() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS retention_boosts (
      id TEXT PRIMARY KEY,
      launch_id TEXT NOT NULL,
      numeric_launch_id INTEGER NOT NULL,
      package_id TEXT NOT NULL,
      wallet TEXT NOT NULL,
      tx_hash TEXT UNIQUE NOT NULL,
      eyes_spent REAL NOT NULL,
      burn_amount REAL NOT NULL,
      treasury_amount REAL NOT NULL,
      rank_multiplier REAL NOT NULL,
      label TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_retention_boosts_launch ON retention_boosts(launch_id);
    CREATE INDEX IF NOT EXISTS idx_retention_boosts_expires ON retention_boosts(expires_at);

    CREATE TABLE IF NOT EXISTS retention_launch_fees (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      tx_hash TEXT UNIQUE NOT NULL,
      eyes_spent REAL NOT NULL,
      burn_amount REAL NOT NULL,
      treasury_amount REAL NOT NULL,
      launch_tx_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retention_season_points (
      wallet TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      points REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (wallet, season_number)
    );

    CREATE TABLE IF NOT EXISTS retention_season_events (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      points REAL NOT NULL,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_retention_season_wallet ON retention_season_events(wallet, season_number);

    CREATE TABLE IF NOT EXISTS retention_alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL,
      launch_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      min_tier TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

function mapBoostRow(row) {
  if (!row) return null
  return {
    id: row.id,
    launchId: row.launch_id,
    numericLaunchId: row.numeric_launch_id,
    packageId: row.package_id,
    wallet: row.wallet,
    txHash: row.tx_hash,
    eyesSpent: row.eyes_spent,
    burnAmount: row.burn_amount,
    treasuryAmount: row.treasury_amount,
    rankMultiplier: row.rank_multiplier,
    label: row.label,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

function mapFeeRow(row) {
  if (!row) return null
  return {
    id: row.id,
    wallet: row.wallet,
    txHash: row.tx_hash,
    eyesSpent: row.eyes_spent,
    burnAmount: row.burn_amount,
    treasuryAmount: row.treasury_amount,
    launchTxHash: row.launch_tx_hash ?? undefined,
    createdAt: row.created_at,
  }
}

function seasonKey(wallet, seasonNumber) {
  return `${wallet.toLowerCase()}:${seasonNumber}`
}

function appendSeasonPoints(wallet, seasonNumber, type, rawPoints, meta) {
  const w = wallet.toLowerCase()
  const now = new Date().toISOString()
  const row = db
    .prepare('SELECT points FROM retention_season_points WHERE wallet = ? AND season_number = ?')
    .get(w, seasonNumber)
  const currentPoints = row?.points ?? 0

  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const todayAgg = db
    .prepare(
      `SELECT COALESCE(SUM(points), 0) as total FROM retention_season_events
       WHERE wallet = ? AND season_number = ? AND created_at >= ?`,
    )
    .get(w, seasonNumber, dayStart.toISOString())
  const todayPoints = todayAgg?.total ?? 0
  const capped = Math.min(rawPoints, Math.max(0, SEASON_MAX_POINTS_PER_DAY - todayPoints))

  const eventId = randomUUID()
  db.prepare(
    `INSERT INTO retention_season_events (id, wallet, season_number, event_type, points, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    eventId,
    w,
    seasonNumber,
    type,
    capped,
    meta ? JSON.stringify(meta) : null,
    now,
  )

  if (row) {
    db.prepare(
      'UPDATE retention_season_points SET points = ?, updated_at = ? WHERE wallet = ? AND season_number = ?',
    ).run(currentPoints + capped, now, w, seasonNumber)
  } else {
    db.prepare(
      `INSERT INTO retention_season_points (wallet, season_number, points, updated_at)
       VALUES (?, ?, ?, ?)`,
    ).run(w, seasonNumber, capped, now)
  }

  return {
    id: eventId,
    type,
    points: capped,
    meta,
    createdAt: now,
  }
}

export function getRetentionLedger() {
  const boosts = db
    .prepare('SELECT * FROM retention_boosts ORDER BY created_at DESC')
    .all()
    .map(mapBoostRow)
  const launchFees = db
    .prepare('SELECT * FROM retention_launch_fees ORDER BY created_at DESC')
    .all()
    .map(mapFeeRow)

  const seasonRows = db.prepare('SELECT * FROM retention_season_points').all()
  const seasonPoints = seasonRows.map((row) => {
    const events = db
      .prepare(
        `SELECT * FROM retention_season_events WHERE wallet = ? AND season_number = ? ORDER BY created_at ASC`,
      )
      .all(row.wallet, row.season_number)
      .map((e) => ({
        id: e.id,
        type: e.event_type,
        points: e.points,
        meta: e.meta_json ? JSON.parse(e.meta_json) : undefined,
        createdAt: e.created_at,
      }))
    return {
      wallet: row.wallet,
      seasonNumber: row.season_number,
      points: row.points,
      events,
      updatedAt: row.updated_at,
    }
  })

  const alerts = db
    .prepare('SELECT * FROM retention_alerts ORDER BY created_at DESC LIMIT 200')
    .all()
    .map((a) => ({
      id: a.id,
      type: a.alert_type,
      launchId: a.launch_id ?? undefined,
      title: a.title,
      body: a.body,
      minTier: a.min_tier,
      createdAt: a.created_at,
    }))

  return {
    boosts,
    launchFees,
    seasonPoints,
    alerts,
    updatedAt: new Date().toISOString(),
  }
}

export function recordBoostRecord(input) {
  const existing = db
    .prepare('SELECT * FROM retention_boosts WHERE tx_hash = ?')
    .get(input.txHash.toLowerCase())
  if (existing) return mapBoostRow(existing)

  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO retention_boosts (
      id, launch_id, numeric_launch_id, package_id, wallet, tx_hash,
      eyes_spent, burn_amount, treasury_amount, rank_multiplier, label, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.launchId,
    input.numericLaunchId,
    input.packageId,
    input.wallet.toLowerCase(),
    input.txHash.toLowerCase(),
    input.eyesSpent,
    input.burnAmount,
    input.treasuryAmount,
    input.rankMultiplier,
    input.label,
    input.expiresAt,
    now,
  )

  if (input.seasonNumber != null) {
    appendSeasonPoints(
      input.wallet,
      input.seasonNumber,
      'boost_spent',
      Math.floor(input.eyesSpent * BOOST_POINT_WEIGHT),
      { launchId: input.launchId, packageId: input.packageId },
    )
  }

  return mapBoostRow(db.prepare('SELECT * FROM retention_boosts WHERE id = ?').get(id))
}

export function recordLaunchFeeRecord(input) {
  const existing = db
    .prepare('SELECT * FROM retention_launch_fees WHERE tx_hash = ?')
    .get(input.txHash.toLowerCase())
  if (existing) return mapFeeRow(existing)

  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO retention_launch_fees (
      id, wallet, tx_hash, eyes_spent, burn_amount, treasury_amount, launch_tx_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.wallet.toLowerCase(),
    input.txHash.toLowerCase(),
    input.eyesSpent,
    input.burnAmount,
    input.treasuryAmount,
    input.launchTxHash ?? null,
    now,
  )

  if (input.seasonNumber != null) {
    appendSeasonPoints(input.wallet, input.seasonNumber, 'launch_fee', LAUNCH_FEE_POINTS, {
      txHash: input.txHash,
    })
  }

  return mapFeeRow(db.prepare('SELECT * FROM retention_launch_fees WHERE id = ?').get(id))
}

export function upsertRetentionAlerts(alerts) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO retention_alerts (id, alert_type, launch_id, title, body, min_tier, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  let added = 0
  for (const alert of alerts) {
    const r = insert.run(
      alert.id,
      alert.type,
      alert.launchId ?? null,
      alert.title,
      alert.body,
      alert.minTier,
      alert.createdAt,
    )
    if (r.changes > 0) added++
  }
  return { added }
}

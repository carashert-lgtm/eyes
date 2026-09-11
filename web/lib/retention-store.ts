import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

import path from 'path'

import { randomUUID } from 'crypto'

import type { LaunchBoost } from '@/lib/launch-types'

import {

  CREATOR_BOOST_PACKAGES,

  SEASON_CONFIG,

  type StakeTierId,

} from '@/lib/retention-config'

import { getCurrentSeason } from '@/lib/season-utils'

import { callBot } from '@/lib/bot-webhook'

import type {

  BoostRecord,

  LaunchFeeRecord,

  RetentionAlert,

  RetentionLedger,

  SeasonLeaderRow,

  SeasonPointEvent,

} from '@/lib/retention-types'



const LEDGER_PATH = path.join(process.cwd(), 'data', 'retention-ledger.json')



let memoryLedger: RetentionLedger | null = null

let botLedgerCache: { ledger: RetentionLedger; at: number } | null = null

const BOT_CACHE_MS = 12_000



const EMPTY_LEDGER: RetentionLedger = {

  boosts: [],

  launchFees: [],

  seasonPoints: [],

  alerts: [],

  updatedAt: new Date(0).toISOString(),

}



function useBotLedger(): boolean {

  return process.env.VERCEL === '1' || Boolean(process.env.BOT_WEBHOOK_URL)

}



function readLocalLedger(): RetentionLedger {

  if (!existsSync(LEDGER_PATH)) return { ...EMPTY_LEDGER }

  try {

    return JSON.parse(readFileSync(LEDGER_PATH, 'utf-8')) as RetentionLedger

  } catch {

    return { ...EMPTY_LEDGER }

  }

}



function writeLocalLedger(ledger: RetentionLedger) {

  ledger.updatedAt = new Date().toISOString()

  try {

    mkdirSync(path.dirname(LEDGER_PATH), { recursive: true })

    writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8')

  } catch {

    memoryLedger = ledger

  }

}



function invalidateBotCache() {

  botLedgerCache = null

}



export async function getRetentionLedger(): Promise<RetentionLedger> {

  if (useBotLedger()) {

    if (botLedgerCache && Date.now() - botLedgerCache.at < BOT_CACHE_MS) {

      return botLedgerCache.ledger

    }

    const bot = await callBot<{ ok: true; ledger: RetentionLedger }>(

      '/webhook/retention/ledger',

      {},

    )

    if (bot.ok && bot.data.ledger) {

      botLedgerCache = { ledger: bot.data.ledger, at: Date.now() }

      return bot.data.ledger

    }

    console.warn('[retention-store] bot ledger read failed:', bot.ok ? 'empty' : bot.error)

    return botLedgerCache?.ledger ?? memoryLedger ?? { ...EMPTY_LEDGER }

  }

  if (memoryLedger) return memoryLedger

  return readLocalLedger()

}



/** Sync read for local scripts/tests only — not used on Vercel production paths. */

export function readRetentionLedger(): RetentionLedger {

  if (useBotLedger()) {

    return botLedgerCache?.ledger ?? memoryLedger ?? { ...EMPTY_LEDGER }

  }

  if (memoryLedger) return memoryLedger

  return readLocalLedger()

}



function persistLocalLedger(ledger: RetentionLedger) {

  ledger.updatedAt = new Date().toISOString()

  memoryLedger = ledger

  if (!useBotLedger()) writeLocalLedger(ledger)

}



function seasonKey(wallet: string, seasonNumber: number) {

  return `${wallet.toLowerCase()}:${seasonNumber}`

}



function appendSeasonPointsLocal(

  ledger: RetentionLedger,

  wallet: string,

  type: SeasonPointEvent['type'],

  rawPoints: number,

  meta?: Record<string, string | number>,

): SeasonPointEvent {

  const season = getCurrentSeason()

  const key = seasonKey(wallet, season.seasonNumber)

  let row = ledger.seasonPoints.find((s) => seasonKey(s.wallet, s.seasonNumber) === key)

  if (!row) {

    row = {

      wallet: wallet.toLowerCase(),

      seasonNumber: season.seasonNumber,

      points: 0,

      events: [],

      updatedAt: new Date().toISOString(),

    }

    ledger.seasonPoints.push(row)

  }



  const dayStart = new Date()

  dayStart.setUTCHours(0, 0, 0, 0)

  const todayPoints = row.events

    .filter((e) => new Date(e.createdAt).getTime() >= dayStart.getTime())

    .reduce((sum, e) => sum + e.points, 0)

  const capped = Math.min(

    rawPoints,

    Math.max(0, SEASON_CONFIG.maxPointsPerDay - todayPoints),

  )



  const event: SeasonPointEvent = {

    id: randomUUID(),

    type,

    points: capped,

    meta,

    createdAt: new Date().toISOString(),

  }

  row.events.push(event)

  row.points += capped

  row.updatedAt = new Date().toISOString()

  return event

}



export async function recordBoost(input: {

  launchId: string

  numericLaunchId: number

  packageId: string

  wallet: string

  txHash: string

  eyesSpent: number

  burnAmount: number

  treasuryAmount: number

}): Promise<BoostRecord> {

  const pkg = CREATOR_BOOST_PACKAGES.find((p) => p.id === input.packageId)

  if (!pkg) throw new Error('Unknown boost package')



  const expiresAt = new Date(Date.now() + pkg.durationHours * 60 * 60 * 1000).toISOString()

  const season = getCurrentSeason()



  if (useBotLedger()) {

    const bot = await callBot<{ ok: true; record: BoostRecord }>('/webhook/retention/boost', {

      ...input,

      rankMultiplier: pkg.rankBoost,

      label: pkg.label,

      expiresAt,

      seasonNumber: season.seasonNumber,

    })

    if (bot.ok) {

      invalidateBotCache()

      return bot.data.record

    }

    throw new Error(bot.error || 'Could not save boost record')

  }



  const ledger = readLocalLedger()

  const existing = ledger.boosts.find(

    (b) => b.txHash.toLowerCase() === input.txHash.toLowerCase(),

  )

  if (existing) return existing



  const record: BoostRecord = {

    id: randomUUID(),

    launchId: input.launchId,

    numericLaunchId: input.numericLaunchId,

    packageId: input.packageId,

    wallet: input.wallet.toLowerCase(),

    txHash: input.txHash,

    eyesSpent: input.eyesSpent,

    burnAmount: input.burnAmount,

    treasuryAmount: input.treasuryAmount,

    rankMultiplier: pkg.rankBoost,

    label: pkg.label,

    expiresAt,

    createdAt: new Date().toISOString(),

  }

  ledger.boosts.push(record)

  appendSeasonPointsLocal(

    ledger,

    input.wallet,

    'boost_spent',

    Math.floor(input.eyesSpent * SEASON_CONFIG.pointWeights.boostSpent),

    { launchId: input.launchId, packageId: input.packageId },

  )

  persistLocalLedger(ledger)

  return record

}



export async function recordLaunchFee(input: {

  wallet: string

  txHash: string

  eyesSpent: number

  burnAmount: number

  treasuryAmount: number

  launchTxHash?: string

}): Promise<LaunchFeeRecord> {

  const season = getCurrentSeason()



  if (useBotLedger()) {

    const bot = await callBot<{ ok: true; record: LaunchFeeRecord }>(

      '/webhook/retention/launch-fee',

      {

        ...input,

        seasonNumber: season.seasonNumber,

      },

    )

    if (bot.ok) {

      invalidateBotCache()

      return bot.data.record

    }

    throw new Error(bot.error || 'Could not save launch fee record')

  }



  const ledger = readLocalLedger()

  const existing = ledger.launchFees.find(

    (f) => f.txHash.toLowerCase() === input.txHash.toLowerCase(),

  )

  if (existing) return existing



  const record: LaunchFeeRecord = {

    id: randomUUID(),

    wallet: input.wallet.toLowerCase(),

    txHash: input.txHash,

    eyesSpent: input.eyesSpent,

    burnAmount: input.burnAmount,

    treasuryAmount: input.treasuryAmount,

    launchTxHash: input.launchTxHash,

    createdAt: new Date().toISOString(),

  }

  ledger.launchFees.push(record)

  appendSeasonPointsLocal(

    ledger,

    input.wallet,

    'launch_fee',

    SEASON_CONFIG.pointWeights.launchCreated,

    { txHash: input.txHash },

  )

  persistLocalLedger(ledger)

  return record

}



export function activeBoostForLaunch(

  launchId: string,

  ledger: RetentionLedger,

  now = Date.now(),

): LaunchBoost | null {

  const active = ledger.boosts

    .filter(

      (b) =>

        b.launchId === launchId &&

        new Date(b.expiresAt).getTime() > now,

    )

    .sort((a, b) => b.rankMultiplier - a.rankMultiplier)[0]



  if (!active) return null

  return {

    packageId: active.packageId,

    label: active.label,

    rankMultiplier: active.rankMultiplier,

    expiresAt: active.expiresAt,

    eyesSpent: active.eyesSpent,

    burnPercent: Math.round((active.burnAmount / active.eyesSpent) * 100),

  }

}



export async function mergeBoostsIntoLaunches<T extends { id: string; boost: LaunchBoost | null }>(

  launches: T[],

): Promise<T[]> {

  const ledger = await getRetentionLedger()

  return launches.map((launch) => {

    const boost = activeBoostForLaunch(launch.id, ledger)

    return boost ? { ...launch, boost } : { ...launch, boost: null }

  })

}



export async function getSeasonLeaderboard(limit = 20): Promise<SeasonLeaderRow[]> {

  const ledger = await getRetentionLedger()

  const season = getCurrentSeason()

  const rows = ledger.seasonPoints

    .filter((s) => s.seasonNumber === season.seasonNumber)

    .sort((a, b) => b.points - a.points || a.wallet.localeCompare(b.wallet))

    .slice(0, limit)



  return rows.map((row, i) => ({

    rank: i + 1,

    wallet: row.wallet,

    points: row.points,

    tierHint: 'scout' as StakeTierId,

  }))

}



export async function getWalletSeasonPoints(wallet: string): Promise<{

  seasonNumber: number

  points: number

  rank: number | null

}> {

  const ledger = await getRetentionLedger()

  const season = getCurrentSeason()

  const row = ledger.seasonPoints.find(

    (s) =>

      s.wallet.toLowerCase() === wallet.toLowerCase() &&

      s.seasonNumber === season.seasonNumber,

  )

  const sorted = ledger.seasonPoints

    .filter((s) => s.seasonNumber === season.seasonNumber)

    .sort((a, b) => b.points - a.points)

  const rank =

    row != null

      ? sorted.findIndex((s) => s.wallet.toLowerCase() === wallet.toLowerCase()) + 1

      : null

  return {

    seasonNumber: season.seasonNumber,

    points: row?.points ?? 0,

    rank: rank && rank > 0 ? rank : null,

  }

}



export async function upsertAlerts(alerts: RetentionAlert[]) {

  if (useBotLedger()) {

    const bot = await callBot<{ ok: true; added: number }>('/webhook/retention/alerts', {

      alerts,

    })

    if (bot.ok) {

      invalidateBotCache()

      return

    }

    console.warn('[retention-store] bot alerts upsert failed:', bot.error)

  }



  const ledger = readLocalLedger()

  const ids = new Set(ledger.alerts.map((a) => a.id))

  for (const alert of alerts) {

    if (!ids.has(alert.id)) ledger.alerts.unshift(alert)

  }

  ledger.alerts = ledger.alerts.slice(0, 200)

  persistLocalLedger(ledger)

}



export function filterAlertsForTier(

  alerts: RetentionAlert[],

  tierId: StakeTierId,

  limit = 30,

): RetentionAlert[] {

  const tierOrder: StakeTierId[] = ['scout', 'builder', 'operator', 'core']

  const tierIndex = tierOrder.indexOf(tierId)

  const now = Date.now()



  return alerts

    .filter((alert) => {

      const minIndex = tierOrder.indexOf(alert.minTier)

      if (minIndex > tierIndex) return false

      const earlyMinutes = tierIndex > 0 ? (tierIndex - minIndex) * 15 : 0

      const visibleAt = new Date(alert.createdAt).getTime() - earlyMinutes * 60 * 1000

      return now >= visibleAt

    })

    .slice(0, limit)

}



export async function listAlertsForTier(

  tierId: StakeTierId,

  limit = 30,

): Promise<RetentionAlert[]> {

  const ledger = await getRetentionLedger()

  return filterAlertsForTier(ledger.alerts, tierId, limit)

}



export async function countBoostsByWallet(wallet: string): Promise<number> {

  const ledger = await getRetentionLedger()

  return ledger.boosts.filter((b) => b.wallet.toLowerCase() === wallet.toLowerCase()).length

}



/** @deprecated use getRetentionLedger — kept for local test scripts */

export function addSeasonPoints(

  wallet: string,

  type: SeasonPointEvent['type'],

  rawPoints: number,

  meta?: Record<string, string | number>,

): SeasonPointEvent {

  const ledger = readLocalLedger()

  const event = appendSeasonPointsLocal(ledger, wallet, type, rawPoints, meta)

  persistLocalLedger(ledger)

  return event

}



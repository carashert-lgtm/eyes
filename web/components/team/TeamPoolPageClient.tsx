'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Lock, RefreshCw, Users, Wallet } from 'lucide-react'
import { PoolPieChart } from '@/components/pool/PoolPieChart'
import { truncateAddress } from '@/lib/address-utils'
import { TEAM_POOL } from '@/lib/platform-config'
import { FOUNDER_SHARE, formatTokensFull, formatTokensShort } from '@/lib/founder-share-config'
import type { PoolSnapshot, PoolUserRecord } from '@/lib/pool-types'
import { useAppWallet } from '@/hooks/useAppWallet'

const POLL_MS = 15_000

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <p className="font-mono-label text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

export function TeamPoolPageClient({
  sessionUsername,
  sessionDiscordId,
}: {
  sessionUsername?: string | null
  sessionDiscordId?: string | null
}) {
  const { address, isConnected } = useAppWallet()
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null)
  const [user, setUser] = useState<PoolUserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadSnapshot = useCallback(async (quiet = false) => {
    if (!quiet) setSyncing(true)
    try {
      const res = await fetch('/api/team/pool', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as PoolSnapshot
        setSnapshot(data)
        setLastSync(new Date())
      }
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadSnapshot()
    const id = window.setInterval(() => loadSnapshot(true), POLL_MS)
    return () => window.clearInterval(id)
  }, [loadSnapshot])

  useEffect(() => {
    const params = new URLSearchParams()
    if (sessionDiscordId) params.set('discordId', sessionDiscordId)
    else if (address) params.set('wallet', address)
    else {
      setUser(null)
      return
    }

    fetch(`/api/team/pool/user?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
  }, [address, sessionDiscordId])

  const pool = snapshot?.pool
  const ref = snapshot?.referral
  const total = pool?.total ?? TEAM_POOL.totalTokens
  const claimedPct = total ? ((pool?.claimed ?? 0) / total) * 100 : 0
  const lockedPct = total ? ((pool?.locked ?? 0) / total) * 100 : 0

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="font-mono-label text-primary">Owner allocation pool</span>
            <span className="inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/5 px-2 py-1 font-mono-label text-[0.58rem] text-primary">
              {syncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              Live sync · Discord bot
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Owner allocation · {formatTokensShort(FOUNDER_SHARE.totalTokens)} $EYES
          </h1>
          <p className="mt-3 text-muted-foreground">
            {FOUNDER_SHARE.totalPercent}% of supply ({formatTokensFull(FOUNDER_SHARE.totalTokens)}{' '}
            $EYES) reserved for the owner. Locked, unlocked, and claimed status below — not public
            total supply.
          </p>
          {sessionUsername ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as <strong className="text-foreground">{sessionUsername}</strong>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => loadSnapshot()}
          disabled={syncing}
          className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-sm border border-dashed border-border py-20 text-center text-muted-foreground">
          Loading team pool…
        </div>
      ) : !snapshot || (snapshot.users.length === 0 && snapshot.pool.total === 0) ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">
            Pool data syncing
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Pool data has not synced yet. If this persists, contact the owner — Team Space
            is private and not shown on public pages.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-sm border border-border bg-surface p-6 lg:p-8">
            <PoolPieChart
              locked={pool?.locked ?? 0}
              unlocked={pool?.unlocked ?? 0}
              claimed={pool?.claimed ?? 0}
              remaining={pool?.remaining ?? 0}
              total={total}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Owner allocation pool"
              value={formatTokensShort(total)}
              sub={`${FOUNDER_SHARE.totalPercent}% owner`}
            />
            <StatCard label="Claimed" value={`${claimedPct.toFixed(1)}%`} />
            <StatCard label="Locked" value={`${lockedPct.toFixed(1)}%`} />
            <StatCard
              label="Unlocked unclaimed"
              value={`${total ? (((pool?.unlocked ?? 0) / total) * 100).toFixed(1) : '0'}%`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-sm border border-border bg-surface p-5">
              <Users className="h-5 w-5 text-primary" />
              <p className="mt-3 font-mono-label text-muted-foreground">Team members</p>
              <p className="font-display text-2xl font-bold">{ref?.totalUsers ?? 0}</p>
            </div>
            <div className="rounded-sm border border-border bg-surface p-5">
              <Gift className="h-5 w-5 text-primary" />
              <p className="mt-3 font-mono-label text-muted-foreground">Allocated rewards</p>
              <p className="font-display text-2xl font-bold">
                {(ref?.totalInviteRewards ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-sm border border-border bg-surface p-5">
              <Lock className="h-5 w-5 text-primary" />
              <p className="mt-3 font-mono-label text-muted-foreground">Pending locked</p>
              <p className="font-display text-2xl font-bold">
                {(ref?.pendingLockedRewards ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="rounded-sm border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">
            Your allocation
          </h2>
        </div>
        {user ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono-label text-muted-foreground">Discord</dt>
              <dd className="font-medium">{user.username}</dd>
            </div>
            <div>
              <dt className="font-mono-label text-muted-foreground">Referral code</dt>
              <dd className="font-mono text-primary">{user.referralCode}</dd>
            </div>
            <div>
              <dt className="font-mono-label text-muted-foreground">Locked</dt>
              <dd>{user.locked.toLocaleString()} $EYES</dd>
            </div>
            <div>
              <dt className="font-mono-label text-muted-foreground">Unlocked</dt>
              <dd>{user.unlocked.toLocaleString()} $EYES</dd>
            </div>
            <div>
              <dt className="font-mono-label text-muted-foreground">Claimed</dt>
              <dd>{user.claimed.toLocaleString()} $EYES</dd>
            </div>
            {user.walletAddress ? (
              <div>
                <dt className="font-mono-label text-muted-foreground">Wallet</dt>
                <dd className="font-mono">{truncateAddress(user.walletAddress)}</dd>
              </div>
            ) : null}
          </dl>
        ) : sessionDiscordId ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No allocation record for your Discord account yet. Owner can grant via{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">!teamadd</code>.
          </p>
        ) : !isConnected ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Connect wallet to view allocation linked via Discord{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">!linkwallet</code>,
            or use a code assigned to your Discord account.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No allocation linked to {truncateAddress(address!)}.
          </p>
        )}
      </div>

      <p className="text-center font-mono-label text-[0.58rem] text-muted-foreground">
        Team pool snapshot
        {snapshot?.updatedAt
          ? ` · Bot updated ${new Date(snapshot.updatedAt).toLocaleString()}`
          : ''}
        {lastSync ? ` · Page synced ${lastSync.toLocaleTimeString()}` : ''}
      </p>
    </div>
  )
}

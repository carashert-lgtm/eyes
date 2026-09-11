'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Timer, TrendingUp } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { LaunchBoostPanel } from '@/components/app/LaunchBoostPanel'
import { CopyAddressInline } from '@/components/ui/CopyAddressInline'
import { formatWindowCountdown } from '@/lib/launch-ranking'
import { phaseLabel, type RankedLaunch } from '@/lib/launch-types'
import { getLaunchChain } from '@/lib/launch-chains/registry'
import { getLaunchNativeFeeSymbol, getLaunchTradeLabel } from '@/lib/platform-status'
import { ROUTES, TOKENOMICS } from '@/lib/site-config'
import { cn } from '@/lib/utils'

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function LaunchDetail({ launchId }: { launchId: string }) {
  const [launch, setLaunch] = useState<RankedLaunch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/launches/${encodeURIComponent(launchId)}`)
      const data = (await res.json()) as { launch?: RankedLaunch; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Not found')
      setLaunch(data.launch ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setLaunch(null)
    } finally {
      setLoading(false)
    }
  }, [launchId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <p className="rounded-sm border border-border bg-surface px-6 py-16 text-center text-sm text-muted-foreground">
        Loading launch…
      </p>
    )
  }

  if (error || !launch) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-surface px-6 py-12 text-center">
        <p className="text-sm text-destructive">{error ?? 'Launch not found'}</p>
        <Link href={ROUTES.appLaunches} className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to discovery
        </Link>
      </div>
    )
  }

  const countdown = formatWindowCountdown(launch.windowEndsInSec)
  const chain = getLaunchChain(launch.chainKey)
  const tradeLabel = getLaunchTradeLabel(launch.chainKey)
  const nativeFeeSymbol = getLaunchNativeFeeSymbol(launch.chainKey)
  const phaseStyles = {
    Pending: 'border-border bg-muted text-muted-foreground',
    EyesWindow: 'border-primary/40 bg-primary/10 text-primary',
    Trading: 'border-edge/30 bg-edge/5 text-edge',
  } as const

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={ROUTES.appLaunches}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Discovery
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Launch</span>
          <WiringBadge />
          <span
            className={cn(
              'inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium',
              phaseStyles[launch.phase],
            )}
          >
            {phaseLabel(launch.phase)}
          </span>
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-xl font-bold text-primary">
            {launch.symbol.slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {launch.name}
            </h1>
            <p className="font-mono-label text-muted-foreground">
              ${launch.symbol} · {chain.label}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Creator {truncateAddress(launch.creator)}
            </p>
            {launch.fomoUrl ? (
              <a
                href={launch.fomoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Trade on {tradeLabel} →
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {countdown ? (
        <div className="flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Timer className="h-4 w-4" />
          Eyes Window ends in {countdown}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Rank score', value: launch.rankScore.toFixed(2) },
          { label: 'Vol 24h', value: formatUsd(launch.volumeUsd24h) },
          { label: 'Trades 24h', value: launch.trades24h.toLocaleString() },
          { label: '$EYES burned', value: launch.eyesBurnedTotal.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-sm border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {launch.lpLocked ? (
          <span className="rounded-sm border border-border bg-background px-2 py-1">LP locked ✓</span>
        ) : null}
        <span className="rounded-sm border border-border bg-background px-2 py-1">
          {TOKENOMICS.tradingFee} · {TOKENOMICS.feeSplit}
        </span>
        {launch.isBoosted && launch.boost ? (
          <span className="rounded-sm border border-accent-glow/40 bg-accent-glow/10 px-2 py-1 text-edge">
            {launch.boost.label} boost active
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-sm border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Activity</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Token</dt>
              <dd className="mt-1">
                <CopyAddressInline address={launch.tokenAddress} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Launch ID</dt>
              <dd>{launch.launchId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rank position</dt>
              <dd>#{launch.rankPosition}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Network</dt>
              <dd>{chain.label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fees 24h</dt>
              <dd>
                {launch.feesEth24h} {nativeFeeSymbol}
              </dd>
            </div>
          </dl>
        </div>

        <LaunchBoostPanel launchId={launch.id} launchName={launch.name} onBoosted={load} />
      </div>
    </div>
  )
}

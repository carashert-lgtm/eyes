'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Flame,
  Rocket,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES, STATUS, TOKENOMICS } from '@/lib/site-config'
import { formatWindowCountdown } from '@/lib/launch-ranking'
import { phaseLabel, type RankedLaunch } from '@/lib/launch-types'
import { cn } from '@/lib/utils'

type FilterId = 'all' | 'trending' | 'new' | 'window-open' | 'boosted'
type SortId = 'rank' | 'newest' | 'volume' | 'activity' | 'window-ending'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'window-open', label: 'Window open' },
  { id: 'boosted', label: 'Boosted' },
]

const SORTS: { id: SortId; label: string }[] = [
  { id: 'rank', label: 'Rank score' },
  { id: 'newest', label: 'Newest' },
  { id: 'volume', label: 'Volume 24h' },
  { id: 'activity', label: 'Activity' },
  { id: 'window-ending', label: 'Window ending' },
]

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function PhaseBadge({ launch }: { launch: RankedLaunch }) {
  const label = phaseLabel(launch.phase)
  const styles = {
    Pending: 'border-border bg-muted text-muted-foreground',
    EyesWindow: 'border-primary/40 bg-primary/10 text-primary',
    Trading: 'border-edge/30 bg-edge/5 text-edge',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        styles[launch.phase],
      )}
    >
      {launch.phase === 'EyesWindow' ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      ) : null}
      {label}
    </span>
  )
}

function LaunchCard({ launch }: { launch: RankedLaunch }) {
  const countdown = formatWindowCountdown(launch.windowEndsInSec)

  return (
    <article className="group relative flex flex-col rounded-sm border border-border bg-surface p-5 transition-all hover:border-primary/40 hover:shadow-sm">
      {launch.rankPosition <= 3 ? (
        <span className="absolute right-3 top-3 font-mono-label text-[0.55rem] text-primary">
          #{launch.rankPosition}
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-sm font-bold text-primary">
          {launch.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display font-bold text-foreground">{launch.name}</h3>
          <p className="font-mono-label text-[0.58rem] text-muted-foreground">${launch.symbol}</p>
        </div>
        <PhaseBadge launch={launch} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Vol 24h</dt>
          <dd className="font-medium text-foreground">{formatUsd(launch.volumeUsd24h)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Trades</dt>
          <dd className="font-medium text-foreground">{launch.trades24h.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">$EYES burned</dt>
          <dd className="font-medium text-edge">{launch.eyesBurnedTotal.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rank</dt>
          <dd className="font-medium text-primary">{launch.rankScore.toFixed(2)}</dd>
        </div>
      </dl>

      {countdown ? (
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary">
          <Timer className="h-3.5 w-3.5 shrink-0" />
          Window ends in {countdown}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {launch.lpLocked ? (
          <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            LP locked ✓
          </span>
        ) : null}
        <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {TOKENOMICS.tradingFee} · 50/50
        </span>
        {launch.isBoosted && launch.boost ? (
          <span className="inline-flex items-center gap-1 rounded-sm border border-accent-glow/40 bg-accent-glow/10 px-2 py-0.5 text-xs font-medium text-edge">
            <Sparkles className="h-3 w-3" />
            {launch.boost.label} boost
          </span>
        ) : null}
      </div>

      <p className="mt-3 font-mono text-[0.65rem] text-muted-foreground">
        {truncateAddress(launch.creator)}
      </p>
    </article>
  )
}

function RankingsPanel({ rankings }: { rankings: RankedLaunch[] }) {
  const top = rankings.slice(0, 5)
  if (!top.length) return null

  return (
    <aside className="rounded-sm border border-border bg-surface p-5 lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-bold text-foreground">Top ranked</h2>
      </div>
      <ol className="space-y-3">
        {top.map((r) => (
          <li key={r.id} className="flex items-center gap-3 text-sm">
            <span className="w-5 shrink-0 font-mono-label text-[0.65rem] text-muted-foreground">
              {r.rankPosition}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatUsd(r.volumeUsd24h)} · {r.trades24h} trades
              </p>
            </div>
            {r.isBoosted ? <Zap className="h-3.5 w-3.5 shrink-0 text-accent-glow" /> : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Rank blends activity, volume, fees, and recency. $EYES boosts multiply visibility.
      </p>
    </aside>
  )
}

export function LaunchesDiscovery() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('rank')
  const [launches, setLaunches] = useState<RankedLaunch[]>([])
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ filter, sort, q: query })
      const res = await fetch(`/api/launches?${params}`)
      const data = (await res.json()) as {
        ok?: boolean
        enabled?: boolean
        launches?: RankedLaunch[]
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setEnabled(data.enabled !== false)
      setLaunches(data.launches ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load launches')
      setLaunches([])
    } finally {
      setLoading(false)
    }
  }, [filter, sort, query])

  useEffect(() => {
    const t = setTimeout(load, query ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, query])

  const stats = useMemo(() => {
    const boosted = launches.filter((l) => l.isBoosted).length
    const windows = launches.filter((l) => l.phase === 'EyesWindow').length
    return { boosted, windows, total: launches.length }
  }, [launches])

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Discovery</span>
          <WiringBadge />
          {stats.boosted > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-accent-glow/30 bg-accent-glow/10 px-2 py-0.5 font-mono-label text-[0.58rem] text-edge">
              <Flame className="h-3 w-3" />
              {stats.boosted} boosted
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Live launch feed
        </h1>
        <p className="mt-3 text-muted-foreground">
          Window countdowns, activity, and rankings — visibility boosted by $EYES.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, ticker, creator…"
          className="w-full max-w-md rounded-sm border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortId)}
          className="rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              'shrink-0 rounded-sm border px-3 py-1.5 text-sm transition-colors',
              filter === item.id
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          {loading ? (
            <div className="rounded-sm border border-border bg-surface/60 px-6 py-16 text-center text-sm text-muted-foreground">
              Loading launches…
            </div>
          ) : error ? (
            <div className="rounded-sm border border-destructive/30 bg-surface px-6 py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !enabled ? (
            <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Discovery is disabled. Set{' '}
                <code className="text-xs">NEXT_PUBLIC_FEATURE_DISCOVERY=true</code> to enable.
              </p>
            </div>
          ) : launches.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
              <Rocket className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h2 className="mt-4 font-display text-xl font-bold text-foreground">
                No launches match
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try another filter or create the first fair launch.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <CtaButton href={ROUTES.appCreate}>Create Launch</CtaButton>
                <CtaButton href={ROUTES.appUtility} variant="secondary">
                  $EYES Utility
                </CtaButton>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {launches.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} />
              ))}
            </div>
          )}
        </div>

        <RankingsPanel rankings={launches} />
      </div>

      <p className="text-center font-mono-label text-[0.58rem] text-muted-foreground">
        {STATUS.network} · snapshot feed · on-chain indexer wiring next · boosts burn {`>`}80% $EYES
      </p>
    </div>
  )
}

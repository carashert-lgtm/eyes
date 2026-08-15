'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Rocket } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES, STATUS, TOKENOMICS } from '@/lib/site-config'
import { cn } from '@/lib/utils'

type LaunchPhase = 'Pending' | 'Eyes Window' | 'Trading'

type LaunchItem = {
  id: string
  name: string
  symbol: string
  creator: string
  phase: LaunchPhase
  windowEndsIn?: string
  lpLocked: boolean
}

const MOCK_LAUNCHES: LaunchItem[] = [
  {
    id: '1',
    name: 'Demo Fair Token',
    symbol: 'DEMO',
    creator: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    phase: 'Eyes Window',
    windowEndsIn: '42m',
    lpLocked: true,
  },
  {
    id: '2',
    name: 'Builder Alpha',
    symbol: 'BUILD',
    creator: '0x8ba1f109551bD432803012645Ac136c22C92900',
    phase: 'Trading',
    lpLocked: true,
  },
]

const FILTERS = ['All', 'Eyes Window', 'Trading', 'Pending'] as const

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function PhaseBadge({ phase }: { phase: LaunchPhase }) {
  const styles: Record<LaunchPhase, string> = {
    Pending: 'border-border bg-muted text-muted-foreground',
    'Eyes Window': 'border-primary/40 bg-primary/10 text-primary',
    Trading: 'border-edge/30 bg-edge/5 text-edge',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium',
        styles[phase],
      )}
    >
      {phase === 'Eyes Window' ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      ) : null}
      {phase}
    </span>
  )
}

function LaunchCard({ launch }: { launch: LaunchItem }) {
  return (
    <article className="flex flex-col rounded-sm border border-border bg-surface p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-sm font-bold text-primary">
          {launch.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display font-bold text-foreground">
            {launch.name}
          </h3>
          <p className="font-mono-label text-[0.58rem] text-muted-foreground">
            ${launch.symbol}
          </p>
        </div>
        <PhaseBadge phase={launch.phase} />
      </div>

      <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>Creator</dt>
          <dd className="font-mono text-foreground">
            {truncateAddress(launch.creator)}
          </dd>
        </div>
        {launch.windowEndsIn ? (
          <div className="flex justify-between">
            <dt>Window</dt>
            <dd className="text-primary">Ends in {launch.windowEndsIn}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {launch.lpLocked ? (
          <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            LP locked ✓
          </span>
        ) : null}
        <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {TOKENOMICS.tradingFee} · 50/50
        </span>
      </div>

      <span
        className="mt-4 text-sm font-medium text-muted-foreground"
        title="Launch detail page wiring pending"
      >
        View launch — coming soon
      </span>
    </article>
  )
}

export function LaunchesDiscovery() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const showMockData = false // flip when indexer wired

  const launches = showMockData ? MOCK_LAUNCHES : []

  const filtered = useMemo(() => {
    return launches.filter((launch) => {
      const matchesFilter =
        filter === 'All' || launch.phase === filter
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        launch.name.toLowerCase().includes(q) ||
        launch.symbol.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [launches, filter, query])

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Discovery</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Fair launches on Eyes Open
        </h1>
        <p className="mt-3 text-muted-foreground">
          Browse active and completed launches. Eyes Window gating and permanent LP
          lock on every launch.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or ticker…"
          className="w-full max-w-md rounded-sm border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
        <select
          className="rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground outline-none"
          defaultValue="newest"
        >
          <option value="newest">Newest first</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              'shrink-0 rounded-sm border px-3 py-1.5 text-sm transition-colors',
              filter === item
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <Rocket className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">
            No launches yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When creators deploy on Eyes Open testnet, they&apos;ll appear here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <CtaButton href={ROUTES.appCreate}>Create Launch</CtaButton>
            <CtaButton href={`${ROUTES.home}#how-it-works`} variant="secondary">
              Learn how it works
            </CtaButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((launch) => (
            <LaunchCard key={launch.id} launch={launch} />
          ))}
        </div>
      )}

      <p className="text-center font-mono-label text-[0.58rem] text-muted-foreground">
        {STATUS.network} data · Verify all contracts on BaseScan · Mainnet after audit
      </p>
    </div>
  )
}

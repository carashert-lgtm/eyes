'use client'

import { useEffect, useState } from 'react'
import { Award, Medal, TrendingUp } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { useEyesBalance } from '@/hooks/useEyesBalance'
import { getCurrentSeason } from '@/lib/season-utils'
import { RETENTION_ENABLED } from '@/lib/retention-config'
import { ROUTES } from '@/lib/site-config'
import Link from 'next/link'

type RankingRow = {
  rank: number
  name: string
  symbol: string
  rankScore: number
  volumeUsd24h: number
  isBoosted: boolean
}

export function SeasonLeaderboard() {
  const season = getCurrentSeason()
  const { tier, balanceFormatted, isConnected } = useEyesBalance()
  const [rankings, setRankings] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rankings?limit=10')
      .then((r) => r.json())
      .then((d: { rankings?: RankingRow[] }) => setRankings(d.rankings ?? []))
      .catch(() => setRankings([]))
      .finally(() => setLoading(false))
  }, [])

  if (!RETENTION_ENABLED) {
    return (
      <p className="text-sm text-muted-foreground">Leaderboards disabled.</p>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Leaderboard</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          {season.label}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {season.daysRemaining} days left · points for launch, trade, stake, and boost activity.
          Badges only — no inflation rewards.
        </p>
      </div>

      {isConnected ? (
        <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Your tier: <strong>{tier.badge} {tier.name}</strong> · {balanceFormatted} $EYES
        </div>
      ) : null}

      <div className="rounded-sm border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-foreground">Top launches</h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : rankings.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No ranked launches yet.</p>
        ) : (
          <ol className="divide-y divide-border">
            {rankings.map((r) => (
              <li key={r.rank} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-xs">
                  {r.rank <= 3 ? (
                    <Medal className={r.rank === 1 ? 'text-accent-glow' : 'text-muted-foreground'} />
                  ) : (
                    r.rank
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {r.name}{' '}
                    <span className="text-xs text-muted-foreground">${r.symbol}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score {r.rankScore} · ${r.volumeUsd24h.toLocaleString()} vol
                    {r.isBoosted ? ' · boosted' : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-sm border border-dashed border-border bg-surface/60 p-5 text-sm text-muted-foreground">
        <Award className="mb-2 h-5 w-5 text-edge" />
        Season points ledger wiring next — ranks update from on-chain activity + boosts.
      </div>

      <Link href={ROUTES.appLaunches} className="text-sm text-primary hover:underline">
        ← Back to discovery
      </Link>
    </div>
  )
}

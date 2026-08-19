'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES } from '@/lib/site-config'
import { phaseLabel, type RankedLaunch } from '@/lib/launch-types'

function formatUsd(n: number) {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function RecentLaunchesFeed() {
  const [launches, setLaunches] = useState<RankedLaunch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/launches?sort=rank&limit=3')
      .then((r) => r.json())
      .then((d: { launches?: RankedLaunch[]; enabled?: boolean }) => {
        if (d.enabled === false) {
          setLaunches([])
          return
        }
        setLaunches(d.launches ?? [])
      })
      .catch(() => setLaunches([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-10 text-center text-sm text-muted-foreground">
        Loading feed…
      </div>
    )
  }

  if (!launches.length) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
        <p className="font-display text-lg font-bold text-foreground">No launches yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Be the first to launch fair on Eyes Open.
        </p>
        <div className="mt-6">
          <CtaButton href={ROUTES.appCreate}>Create Launch</CtaButton>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-sm border border-border bg-surface">
      {launches.map((launch) => (
        <div
          key={launch.id}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        >
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground">
              {launch.name}{' '}
              <span className="font-mono-label text-xs text-muted-foreground">
                ${launch.symbol}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {phaseLabel(launch.phase)} · {formatUsd(launch.volumeUsd24h)} vol · rank{' '}
              {launch.rankScore.toFixed(2)}
            </p>
          </div>
          {launch.isBoosted ? (
            <span className="rounded-sm border border-accent-glow/30 bg-accent-glow/10 px-2 py-0.5 text-xs text-edge">
              Boosted
            </span>
          ) : null}
        </div>
      ))}
      <div className="px-5 py-3">
        <Link
          href={ROUTES.appLaunches}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View discovery feed
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

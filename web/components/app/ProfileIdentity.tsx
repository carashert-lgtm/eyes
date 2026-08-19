'use client'

import { useEffect, useState } from 'react'
import { Award, Shield, Sparkles } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { useEyesBalance } from '@/hooks/useEyesBalance'
import { EYES_STAKE_TIERS, RETENTION_ENABLED } from '@/lib/retention-config'
import { getCurrentSeason } from '@/lib/season-utils'
import { ROUTES } from '@/lib/site-config'
import Link from 'next/link'

type SeasonPayload = {
  season?: { label: string; daysRemaining: number }
}

export function ProfileIdentity() {
  const season = getCurrentSeason()
  const { tier, balanceFormatted, isConnected, isLoading } = useEyesBalance()
  const [seasonData, setSeasonData] = useState<SeasonPayload | null>(null)

  useEffect(() => {
    fetch('/api/retention/season')
      .then((r) => r.json())
      .then((d: SeasonPayload) => setSeasonData(d))
      .catch(() => setSeasonData(null))
  }, [])

  if (!RETENTION_ENABLED) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center text-sm text-muted-foreground">
        Profile layer disabled until retention feature flag is on.
      </div>
    )
  }

  const displaySeason = seasonData?.season ?? season

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Identity</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          Your Eyes Open status
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Stake tier, creator reputation, and season rank — tied to $EYES across the ecosystem.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-border bg-surface p-5">
          <Shield className="h-5 w-5 text-primary" />
          <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">Stake tier</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {isConnected
              ? isLoading
                ? '…'
                : `${tier.badge} ${tier.name}`
              : `${EYES_STAKE_TIERS[0].badge} ${EYES_STAKE_TIERS[0].name}`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {isConnected ? `${balanceFormatted} $EYES` : 'Connect wallet to verify balance'}
          </p>
        </div>

        <div className="rounded-sm border border-border bg-surface p-5">
          <Sparkles className="h-5 w-5 text-accent-glow" />
          <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">
            Creator reputation
          </p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">—</p>
          <p className="mt-2 text-xs text-muted-foreground">Launches + community signals</p>
        </div>

        <div className="rounded-sm border border-border bg-surface p-5">
          <Award className="h-5 w-5 text-edge" />
          <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">Season rank</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {displaySeason.label}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {displaySeason.daysRemaining} days left · leaderboard wiring next
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.appUtility} className="text-primary hover:underline">
          Upgrade your stake tier
        </Link>{' '}
        for earlier alerts and boost discounts.
      </p>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Lock, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { CtaButton } from '@/components/ui/CtaButton'
import {
  CREATOR_BOOST_PACKAGES,
  EYES_STAKE_TIERS,
  LAUNCH_FEE_EYES,
  RETENTION_ENABLED,
} from '@/lib/retention-config'
import { getCurrentSeason } from '@/lib/season-utils'
import { ROUTES, TOKENOMICS } from '@/lib/site-config'
import { WalletPanel } from '@/components/wallet/ProfileWalletHome'
import { useEyesBalance } from '@/hooks/useEyesBalance'

export function UtilityCenter() {
  const season = getCurrentSeason()
  const { tier, balanceFormatted, hasWallet } = useEyesBalance()

  if (!RETENTION_ENABLED) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Utility center disabled. Set{' '}
          <code className="text-xs">NEXT_PUBLIC_FEATURE_RETENTION=true</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">$EYES utility</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Hold $EYES. Unlock the ecosystem.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Stake tiers gate tools, alerts, and visibility. Creator boosts and launch fees settle in
          $EYES — with transparent burns.
        </p>
        {hasWallet ? (
          <p className="mt-3 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            Your tier: <strong>{tier.badge} {tier.name}</strong> · {balanceFormatted} $EYES
          </p>
        ) : null}
      </div>

      <WalletPanel compact />

      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">Stake tiers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EYES_STAKE_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="rounded-sm border border-border bg-surface p-5 transition-colors hover:border-primary/30"
            >
              <p className="font-mono-label text-[0.65rem] text-primary">
                {tier.badge} {tier.name}
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {tier.minEyes === 0 ? 'Open' : `${tier.minEyes.toLocaleString()}+`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">$EYES staked</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {tier.perks.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          On-chain stake vault coming post-launch. Tiers today use your live wallet balance.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-glow" />
            <h2 className="font-display text-lg font-bold text-foreground">Creator boosts</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Pay in $EYES for temporary discovery ranking. Most tokens are burned.
          </p>
          <ul className="mt-4 space-y-3">
            {CREATOR_BOOST_PACKAGES.map((pkg) => (
              <li
                key={pkg.id}
                className="flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{pkg.label}</span>
                <span className="text-muted-foreground">
                  {pkg.eyesCost.toLocaleString()} $EYES · {pkg.durationHours}h · {pkg.burnPercent}%
                  burn
                </span>
              </li>
            ))}
          </ul>
          <CtaButton href={ROUTES.appLaunches} className="mt-5" variant="secondary">
            Boost a launch
          </CtaButton>
        </div>

        <div className="rounded-sm border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Launch fee</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Create-launch settlement prefers $EYES with a discount vs ETH equivalent.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">$EYES discount</dt>
              <dd className="font-medium">{LAUNCH_FEE_EYES.eyesDiscountPercent}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Burn on launch fee</dt>
              <dd className="font-medium">{LAUNCH_FEE_EYES.burnPercent}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Trading fee model</dt>
              <dd className="font-medium">{TOKENOMICS.feeSplit}</dd>
            </div>
          </dl>
          <CtaButton href={ROUTES.appCreate} className="mt-5" variant="secondary">
            Create launch
          </CtaButton>
        </div>
      </section>

      <section className="rounded-sm border border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold text-foreground">{season.label}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {season.daysRemaining} days left · points for launch, trade, stake, and boost activity
              — badges only, no inflation rewards.
            </p>
          </div>
          <Link
            href={ROUTES.appProfile}
            className="text-sm font-medium text-primary hover:underline"
          >
            View profile & ranks →
          </Link>
          <Link
            href={ROUTES.appLeaderboard}
            className="text-sm font-medium text-primary hover:underline"
          >
            Season leaderboard →
          </Link>
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Core fair launch rules unchanged — Eyes Window, permanent LP lock, 1% fee split.
      </p>
    </div>
  )
}

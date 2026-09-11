'use client'

import { useEffect, useState } from 'react'
import { Award, Shield, Sparkles } from 'lucide-react'
import { useAppWallet } from '@/hooks/useAppWallet'
import { EyesAuthPanel } from '@/components/wallet/EyesAuthPanel'
import { ProfileWalletHome } from '@/components/wallet/ProfileWalletHome'
import { AccountUpdatesPanel } from '@/components/app/AccountUpdatesPanel'
import { WiringBadge } from '@/components/app/AppShell'
import { useEyesBalance } from '@/hooks/useEyesBalance'
import { EYES_STAKE_TIERS, RETENTION_ENABLED } from '@/lib/retention-config'
import { getCurrentSeason } from '@/lib/season-utils'
import { ROUTES, FEATURES } from '@/lib/site-config'
import Link from 'next/link'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'

type ProfilePayload = {
  reputation?: { score: number; label: string }
  season?: { label: string; daysRemaining: number; points: number; rank: number | null }
}

export function ProfileIdentity() {
  const season = getCurrentSeason()
  const { signedIn, loading } = useEyesAccount()
  const { address, isConnected, hasWallet } = useAppWallet()
  const { tier, balanceFormatted, isLoading, isError } = useEyesBalance()
  const [profile, setProfile] = useState<ProfilePayload | null>(null)

  useEffect(() => {
    if (!RETENTION_ENABLED || !address) {
      setProfile(null)
      return
    }
    fetch(`/api/retention/profile?wallet=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d: ProfilePayload) => setProfile(d))
      .catch(() => setProfile(null))
  }, [address])

  if (!RETENTION_ENABLED && !FEATURES.accountUpdates) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center text-sm text-muted-foreground">
        Profile is not enabled yet.
      </div>
    )
  }

  const displaySeason = profile?.season ?? season
  const reputation = profile?.reputation

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Profile</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          Your Eyes Open account
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Sign in once — your wallet, balance, and launch fees live here.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading account…</p>
      ) : signedIn ? (
        <>
          <ProfileWalletHome />
          {FEATURES.accountUpdates ? <AccountUpdatesPanel /> : null}
        </>
      ) : (
        <EyesAuthPanel defaultMode="signup" />
      )}

      {signedIn && RETENTION_ENABLED ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-sm border border-border bg-surface p-5">
              <Shield className="h-5 w-5 text-primary" />
              <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">Stake tier</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {hasWallet
                  ? isLoading
                    ? '…'
                    : `${tier.badge} ${tier.name}`
                  : `${EYES_STAKE_TIERS[0].badge} ${EYES_STAKE_TIERS[0].name}`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {hasWallet
                  ? isLoading
                    ? 'Loading balance…'
                    : isError
                      ? 'Could not load balance'
                      : `${balanceFormatted} $EYES`
                  : 'Sign in to view balance'}
              </p>
            </div>

            <div className="rounded-sm border border-border bg-surface p-5">
              <Sparkles className="h-5 w-5 text-accent-glow" />
              <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">
                Creator reputation
              </p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {isConnected && reputation ? `${reputation.label} · ${reputation.score}` : '—'}
              </p>
            </div>

            <div className="rounded-sm border border-border bg-surface p-5">
              <Award className="h-5 w-5 text-edge" />
              <p className="mt-3 font-mono-label text-[0.65rem] text-muted-foreground">Season rank</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {displaySeason.label}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {displaySeason.daysRemaining} days left
                {profile?.season?.rank
                  ? ` · rank #${profile.season.rank} · ${profile.season.points} pts`
                  : isConnected
                    ? ` · ${profile?.season?.points ?? 0} pts`
                    : ''}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <Link href={ROUTES.appUtility} className="text-primary hover:underline">
              Upgrade your stake tier
            </Link>{' '}
            for earlier alerts and boost discounts.
          </p>
        </>
      ) : null}
    </div>
  )
}

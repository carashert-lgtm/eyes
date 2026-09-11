'use client'

import { Lock } from 'lucide-react'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES } from '@/lib/site-config'

/** Public-safe gate — team pool data lives in Team Space only. */
export function PoolPageClient() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <span className="font-mono-label text-primary">Team Space</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Private team pool
        </h1>
        <p className="mt-3 text-muted-foreground">
          Owner allocation, vesting status, and referral rewards are available only after
          owner-issued activation — not on public pages.
        </p>
      </div>

      <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h2 className="mt-4 font-display text-xl font-bold text-foreground">
          Team Space required
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Tokenomics publishes the disclosed 10% owner allocation. Individual vesting
          and pool snapshots are private to activated Team Space members.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <CtaButton href={ROUTES.teamActivate}>Enter Team Space</CtaButton>
          <CtaButton href={ROUTES.tokenomics} variant="secondary">
            Read tokenomics
          </CtaButton>
        </div>
      </div>
    </div>
  )
}

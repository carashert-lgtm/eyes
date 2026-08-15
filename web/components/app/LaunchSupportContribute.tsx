'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import {
  FEATURES,
  LAUNCH_SUPPORT,
  ROUTES,
  TOKENOMICS,
} from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { truncateAddress, useWallet } from '@/lib/wallet-context'

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5'] as const

const POOL_USES = [
  'Content distribution',
  'Community growth (Telegram, X)',
  'Launch visibility',
  'Creator & partner outreach',
] as const

const NOT_INCLUDED = [
  `Not part of the ${TOKENOMICS.tradingFee} trading-fee or ${TOKENOMICS.feeSplit} model`,
  'Not a promise of token price movement',
  'Not an investment product',
  'Not discretionary undisclosed spend',
] as const

export function LaunchSupportContribute() {
  const { connected, address, connect } = useWallet()
  const [amount, setAmount] = useState('')
  const [submitState, setSubmitState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  const windowOpen = true // TODO: wire from backend
  const validAmount = Number(amount) > 0
  const canSubmit =
    connected && validAmount && submitState !== 'loading' && windowOpen

  const handleContribute = async () => {
    if (!canSubmit) return
    setSubmitState('loading')
    if (!FEATURES.launchSupportContribute) {
      await new Promise((r) => setTimeout(r, 1000))
      setSubmitState('success')
      return
    }
    // TODO: wire contribution contract / treasury
  }

  if (!windowOpen) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Launch support window closed
        </h1>
        <p className="mt-3 text-muted-foreground">
          The 14-day bootstrap window has ended.
        </p>
        <Link href={ROUTES.home} className="mt-6 inline-block text-primary hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">
            {LAUNCH_SUPPORT.windowDays} days · Pre-launch
          </span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Launch support window
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          A fixed {LAUNCH_SUPPORT.windowDays}-day period before public launch where
          community members can make a bootstrap contribution to the pre-launch growth
          pool.{' '}
          <strong className="font-medium text-foreground">100%</strong> of the pool is
          used for launch visibility and distribution — separate from on-chain{' '}
          {TOKENOMICS.tradingFee} trading-fee tokenomics.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-sm border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-primary">Window progress</span>
              <span className="text-sm text-muted-foreground">
                Day {LAUNCH_SUPPORT.currentDay} of {LAUNCH_SUPPORT.windowDays}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${(LAUNCH_SUPPORT.currentDay / LAUNCH_SUPPORT.windowDays) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Contribute
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-mono-label text-[0.58rem] text-muted-foreground">
                  Total contributed
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-foreground">
                  — ETH
                </dd>
              </div>
              <div>
                <dt className="font-mono-label text-[0.58rem] text-muted-foreground">
                  Contributors
                </dt>
                <dd className="mt-1 font-display text-xl font-bold text-foreground">
                  —
                </dd>
              </div>
            </dl>
            <p className="mt-4 font-mono-label text-[0.58rem] text-muted-foreground">
              100% launch visibility & distribution
            </p>

            {!connected ? (
              <div className="mt-5 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <button
                  type="button"
                  onClick={connect}
                  className="font-medium text-primary hover:underline"
                >
                  Connect wallet
                </button>{' '}
                to contribute.
              </div>
            ) : (
              <p className="mt-5 text-xs text-muted-foreground">
                Connected: {address ? truncateAddress(address) : '—'}
              </p>
            )}

            <div className="mt-5">
              <label className="font-mono-label text-[0.58rem] text-muted-foreground">
                Amount (ETH)
              </label>
              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-sm border border-border bg-background py-2.5 pr-14 pl-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  ETH
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={cn(
                      'rounded-sm border px-3 py-1.5 text-xs transition-colors',
                      amount === value
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {submitState === 'success' ? (
              <div className="mt-5 flex items-start gap-3 rounded-sm border border-primary/30 bg-primary/5 p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Contribution received (demo)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Transaction wiring pending on testnet.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContribute}
                disabled={!canSubmit}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:border-primary/70 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitState === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Contribute to launch growth'
                )}
              </button>
            )}

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Not an investment. No guaranteed outcomes. Contributions fund
              operational launch readiness only.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Where contributions go
            </h2>
            <ul className="mt-4 space-y-3">
              {POOL_USES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              What this is not
            </h2>
            <ul className="mt-4 space-y-3">
              {NOT_INCLUDED.map((item) => (
                <li key={item} className="text-sm text-muted-foreground">
                  · {item}
                </li>
              ))}
            </ul>
            <Link
              href={ROUTES.launchSupport}
              className="mt-5 inline-block text-sm text-primary hover:underline"
            >
              Read full details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useAppWallet } from '@/hooks/useAppWallet'
import { CREATOR_BOOST_PACKAGES, computeBoostCost } from '@/lib/retention-config'
import { getBoostPayGates } from '@/lib/boost-pay-gates'
import { useEyesBalance } from '@/hooks/useEyesBalance'
import { useEyesSettlement } from '@/hooks/useEyesSettlement'
import { cn } from '@/lib/utils'

type Props = {
  launchId: string
  launchName: string
  compact?: boolean
  onBoosted?: () => void
}

export function LaunchBoostPanel({ launchId, launchName, compact = false, onBoosted }: Props) {
  const { address, isConnected } = useAppWallet()
  const { tier, balance, ethBalance, balanceReady, isLoading, isError, hasWallet, hasToken } =
    useEyesBalance()
  const { paySettlement, pending } = useEyesSettlement()
  const [packageId, setPackageId] = useState<string>(CREATOR_BOOST_PACKAGES[0].id)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pricing = computeBoostCost(packageId, tier.id)
  const payGates = getBoostPayGates({
    balance,
    ethBalance,
    eyesCost: pricing?.eyesCost ?? null,
    balanceReady,
    isError,
    hasWallet,
    isConnected,
    hasToken,
  })

  const handleBoost = async () => {
    if (!pricing || !payGates.canPay || !address) return
    setError(null)
    setStatus('Confirm burn transfer in wallet…')

    try {
      const txs = await paySettlement({
        burnAmount: pricing.burnAmount,
        treasuryAmount: pricing.treasuryAmount,
      })
      setStatus('Registering boost…')

      const res = await fetch('/api/retention/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchId,
          packageId,
          wallet: address,
          burnTxHash: txs.burnTxHash,
          treasuryTxHash: txs.treasuryTxHash,
          tierId: tier.id,
        }),
      })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) throw new Error(data.error ?? 'Boost registration failed')

      setStatus(data.message ?? 'Boost active')
      onBoosted?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Boost failed')
      setStatus(null)
    }
  }

  if (!hasToken) {
    return (
      <p className="text-xs text-muted-foreground">
        $EYES token address not configured — boosts unavailable.
      </p>
    )
  }

  return (
    <div className={cn('rounded-sm border border-border bg-surface', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-glow" />
        <h3 className="font-display text-sm font-bold text-foreground">Boost visibility</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pay in $EYES for temporary ranking on {launchName}. Most tokens are burned.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CREATOR_BOOST_PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setPackageId(pkg.id)}
            className={cn(
              'rounded-sm border px-2.5 py-1.5 text-xs transition-colors',
              packageId === pkg.id
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {pkg.label}
          </button>
        ))}
      </div>

      {pricing ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Cost: <strong className="text-foreground">{pricing.eyesCost.toLocaleString()} $EYES</strong>{' '}
          · {pricing.burnAmount.toLocaleString()} burned · tier discount applied
        </p>
      ) : null}

      {!hasWallet ? (
        <p className="mt-3 text-xs text-muted-foreground">Sign in to view boost options.</p>
      ) : !isConnected ? (
        <p className="mt-3 text-xs text-muted-foreground">Unlock wallet on Profile to pay and boost.</p>
      ) : isLoading || !balanceReady ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading $EYES balance…</p>
      ) : isError ? (
        <p className="mt-3 text-xs text-destructive">Could not load $EYES balance. Refresh and try again.</p>
      ) : payGates.showInsufficientEyes ? (
        <p className="mt-3 text-xs text-destructive">
          Insufficient $EYES balance ({pricing?.eyesCost.toLocaleString()} required).
        </p>
      ) : !payGates.enoughGas ? (
        <p className="mt-3 text-xs text-destructive">Not enough ETH on Base for gas.</p>
      ) : (
        <button
          type="button"
          onClick={handleBoost}
          disabled={pending || !pricing || !payGates.canPay}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            'Pay & boost'
          )}
        </button>
      )}

      {status ? <p className="mt-2 text-xs text-primary">{status}</p> : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

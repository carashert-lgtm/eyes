'use client'

import { useEffect } from 'react'
import {
  Loader2,
  Check,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/site-config'

export type TxStatus = 'confirming' | 'pending' | 'success' | 'failed' | 'rejected'

export type TxDetails = {
  amount?: string
  from?: string
  hash?: string
  time?: string
}

type TransactionResultProps = {
  status: TxStatus
  variant?: 'inline' | 'modal'
  details?: TxDetails
  onRetry?: () => void
  onCancel?: () => void
  onClose?: () => void
}

const BASESCAN = 'https://sepolia.basescan.org/tx/'

function truncateHash(hash: string) {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

function StateFooter() {
  return (
    <p className="mt-8 border-t border-border pt-5 text-center font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
      Not financial advice · Self-custodial · Testnet
    </p>
  )
}

function Spinner() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 rounded-full border border-primary/20" />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

/** Renders the body for a given transaction status. */
function ResultBody({
  status,
  details,
  onRetry,
  onCancel,
}: {
  status: TxStatus
  details?: TxDetails
  onRetry?: () => void
  onCancel?: () => void
}) {
  const hash = details?.hash

  if (status === 'confirming') {
    return (
      <div className="flex flex-col items-center text-center">
        <Spinner />
        <h3 className="mt-6 font-display text-2xl font-bold text-foreground">
          Confirm in your wallet…
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Approve the transaction in your wallet app
        </p>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 font-mono-label text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Cancel
          </button>
        ) : null}
        <StateFooter />
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center text-center">
        <Spinner />
        <h3 className="mt-6 font-display text-2xl font-bold text-foreground">
          Transaction pending…
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Waiting for Base Sepolia confirmation
        </p>
        {hash ? (
          <a
            href={`${BASESCAN}${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-primary/40"
          >
            {truncateHash(hash)}
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
          </a>
        ) : null}
        <StateFooter />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_28px_-6px_rgba(169,127,18,0.7)]">
          <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
        </div>
        <h3 className="mt-6 font-display text-2xl font-bold text-foreground text-balance">
          Presale contribution received
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Thank you — your self-custodial transaction was submitted. 100% of presale proceeds fund
          launch growth and distribution.
        </p>

        {/* Receipt card */}
        <dl className="mt-6 w-full overflow-hidden rounded-sm border border-border bg-surface text-left">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <dt className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Amount
            </dt>
            <dd className="font-mono text-sm font-semibold text-foreground">
              {details?.amount ?? '0.1'} ETH
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <dt className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              From
            </dt>
            <dd className="font-mono text-sm text-foreground">{details?.from ?? '0x742d…bEb0'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <dt className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Tx
            </dt>
            <dd>
              {hash ? (
                <a
                  href={`${BASESCAN}${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-primary underline-offset-2 hover:underline"
                >
                  {truncateHash(hash)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Time
            </dt>
            <dd className="font-mono text-sm text-foreground">
              {details?.time ?? 'Just now · Base Sepolia'}
            </dd>
          </div>
        </dl>

        {/* What happens next */}
        <div className="mt-6 w-full text-left">
          <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
            What happens next
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {[
              'Your transaction settles on Base Sepolia within a few blocks',
              'Presale proceeds route directly to launch growth operations',
              'Follow the announcement channels for launch timing updates',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="leading-relaxed text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href={ROUTES.home}
            className="group flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
          <Link
            href={ROUTES.tokenomics}
            className={cn(
              'flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-sm border px-5 text-sm font-semibold transition-all duration-200',
              'border-primary/50 bg-primary/10 text-primary hover:border-primary/80 hover:bg-primary/20',
              'shadow-[0_0_0_1px_rgba(169,127,18,0.1),0_0_24px_-8px_rgba(169,127,18,0.7)]',
            )}
          >
            Read Tokenomics
          </Link>
        </div>
        <StateFooter />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-6 font-display text-2xl font-bold text-foreground">Transaction failed</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Something went wrong while submitting your transaction. No funds left your wallet. Please
          check your connection and try again.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'mt-7 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-sm border px-5 text-sm font-semibold transition-all duration-200',
              'border-primary/50 bg-primary/10 text-primary hover:border-primary/80 hover:bg-primary/20',
            )}
          >
            Try again
          </button>
        ) : null}
        <StateFooter />
      </div>
    )
  }

  // rejected
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
        <XCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-bold text-foreground">
        Transaction cancelled
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        You declined the transaction in your wallet
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-7 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-sm border px-5 text-sm font-semibold transition-all duration-200',
            'border-primary/50 bg-primary/10 text-primary hover:border-primary/80 hover:bg-primary/20',
          )}
        >
          Try again
        </button>
      ) : null}
      <StateFooter />
    </div>
  )
}

export function TransactionResult({
  status,
  variant = 'inline',
  details,
  onRetry,
  onCancel,
  onClose,
}: TransactionResultProps) {
  const isFailed = status === 'failed'

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (variant !== 'modal') return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [variant])

  // Allow Escape to close the modal.
  useEffect(() => {
    if (variant !== 'modal' || !onClose) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [variant, onClose])

  const card = (
    <div
      className={cn(
        'relative w-full max-w-[480px] rounded-md border bg-card/80 p-6 shadow-lg backdrop-blur-md sm:p-8',
        isFailed ? 'border-destructive/40 shadow-destructive/5' : 'border-primary/25 shadow-primary/5',
      )}
    >
      {variant === 'modal' && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      <ResultBody status={status} details={details} onRetry={onRetry} onCancel={onCancel} />
    </div>
  )

  if (variant === 'modal') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction status"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default bg-background/70 backdrop-blur-sm"
        />
        <div className="relative z-10 max-h-[90vh] w-full max-w-[480px] overflow-y-auto">
          {card}
        </div>
      </div>
    )
  }

  return card
}

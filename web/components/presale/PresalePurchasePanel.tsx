'use client'

import { useEffect, useMemo, useState } from 'react'
import { Wallet, ShieldCheck, ArrowRight, Circle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/ui/Section'
import { TransactionResult } from '@/components/presale/TransactionResult'
import { useWallet } from '@/hooks/useWallet'
import { usePresaleSend } from '@/hooks/usePresaleSend'
import {
  MIN_ETH,
  MAX_ETH,
  PRESALE_RECIPIENT,
  truncateAddress,
} from '@/lib/presale-config'
import { PRESALE_CHAIN } from '@/lib/wagmi'

const PRESETS = ['0.05', '0.1', '0.25', '0.5']

const STATS = [
  { label: 'Raised', value: '—' },
  { label: 'Contributors', value: '—' },
  { label: 'Your contribution', value: '—' },
]

export function PresalePurchasePanel() {
  const {
    address,
    isConnected,
    isConnecting,
    balanceFormatted,
    balanceSymbol,
    wrongNetwork,
    connectInjected,
    connectCoinbase,
    switchToPresaleChain,
    disconnect,
    hasCoinbase,
  } = useWallet()

  const { send, reset, status, hash, canSend } = usePresaleSend()

  const [amount, setAmount] = useState('0.1')
  const [showResult, setShowResult] = useState(false)

  // Surface the transaction modal whenever the send lifecycle is active.
  useEffect(() => {
    if (status) setShowResult(true)
  }, [status])

  const parsed = Number.parseFloat(amount)
  const validity = useMemo(() => {
    if (!amount || Number.isNaN(parsed)) return null
    if (parsed < MIN_ETH) return `Minimum contribution is ${MIN_ETH} ETH`
    if (parsed > MAX_ETH) return `Maximum contribution is ${MAX_ETH} ETH`
    return null
  }, [amount, parsed])

  const disabledReason = !canSend
    ? 'Presale recipient not configured'
    : wrongNetwork
      ? `Switch to ${PRESALE_CHAIN.name}`
      : validity
        ? validity
        : null

  function handleConfirm() {
    if (disabledReason || !amount) return
    send(amount)
  }

  function closeResult() {
    setShowResult(false)
    reset()
  }

  return (
    <section id="buy" className="scroll-mt-20 border-t border-border py-24 lg:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-2">
          {/* Left copy */}
          <div className="lg:pt-4">
            <Eyebrow>Contribute</Eyebrow>
            <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
              Send from your own wallet
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              Connect a self-custodial wallet, choose an amount, and confirm the transaction
              yourself. There is no account, no card, and no balance held on your behalf.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                'You keep custody at every step',
                'Every transaction is signed in your wallet',
                '100% routed to launch growth operations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right panel card */}
          <div className="mx-auto w-full max-w-[480px] rounded-md border border-primary/25 bg-card/70 p-6 shadow-lg shadow-primary/5 backdrop-blur-md sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-foreground">Buy Presale</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                  Send ETH from your wallet — self-custodial, no account required
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono-label text-primary">
                {PRESALE_CHAIN.name} · Testnet
              </span>
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-border bg-border">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-surface px-3 py-3 text-center">
                  <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="mt-0.5 font-mono-label text-[10px] text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {!isConnected ? (
              /* ---- DISCONNECTED ---- */
              <div className="mt-8 flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/5">
                  <Wallet className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-5 text-base leading-relaxed text-foreground text-pretty">
                  Connect your wallet to participate in the presale
                </p>
                <button
                  type="button"
                  onClick={connectInjected}
                  disabled={isConnecting}
                  className={cn(
                    'mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-sm px-5 text-base font-semibold transition-all duration-200',
                    'bg-primary text-primary-foreground hover:brightness-105',
                    'shadow-[0_0_24px_-8px_rgba(169,127,18,0.7)]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                </button>
                {hasCoinbase ? (
                  <button
                    type="button"
                    onClick={connectCoinbase}
                    disabled={isConnecting}
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-sm border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Coinbase Wallet
                  </button>
                ) : null}
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
                  You approve every transfer in your wallet. Eyes Open never holds your funds.
                </p>
              </div>
            ) : (
              /* ---- CONNECTED ---- */
              <div className="mt-6">
                {/* Address row */}
                <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-2 font-mono text-sm text-foreground">
                    <Circle
                      className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500"
                      aria-hidden="true"
                    />
                    {truncateAddress(address)}
                  </span>
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    className="font-mono-label text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    Disconnect
                  </button>
                </div>

                <p className="mt-2 font-mono-label text-muted-foreground">
                  Balance: {balanceFormatted ? `${Number(balanceFormatted).toFixed(4)} ` : '— '}
                  {balanceSymbol}
                </p>

                {/* Wrong network banner */}
                {wrongNetwork ? (
                  <button
                    type="button"
                    onClick={switchToPresaleChain}
                    className="mt-4 flex w-full items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/15"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Wrong network — switch to {PRESALE_CHAIN.name}
                  </button>
                ) : null}

                {/* Amount input */}
                <label className="mt-5 block">
                  <span className="sr-only">Amount in ETH</span>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-sm border bg-surface px-4 py-3.5 transition-colors',
                      validity ? 'border-destructive/60' : 'border-border',
                    )}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent font-display text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="0.0"
                      aria-label="Amount in ETH"
                    />
                    <span className="font-display text-lg font-bold text-muted-foreground">ETH</span>
                  </div>
                </label>

                {/* Quick chips */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={cn(
                        'rounded-sm border px-2 py-2 font-mono-label transition-colors',
                        amount === preset
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Validation hint */}
                <p
                  className={cn(
                    'mt-2 font-mono-label',
                    validity ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {validity ?? `Min ${MIN_ETH} ETH · Max ${MAX_ETH} ETH`}
                </p>

                {/* Summary */}
                <dl className="mt-5 flex flex-col gap-2 rounded-sm border border-border bg-surface px-4 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">You send</dt>
                    <dd className="font-mono font-semibold text-foreground">
                      {amount || '0'} ETH
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Recipient</dt>
                    <dd className="font-mono text-foreground">
                      {truncateAddress(PRESALE_RECIPIENT)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Network</dt>
                    <dd className="font-mono text-foreground">{PRESALE_CHAIN.name}</dd>
                  </div>
                </dl>

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={Boolean(disabledReason) || !amount}
                  className={cn(
                    'group mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-sm border px-5 text-base font-semibold transition-all duration-200',
                    'border-primary/50 bg-primary/10 text-primary hover:border-primary/80 hover:bg-primary/20',
                    'shadow-[0_0_0_1px_rgba(169,127,18,0.1),0_0_24px_-8px_rgba(169,127,18,0.7)]',
                    'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
                  )}
                >
                  {disabledReason ?? 'Confirm Presale Purchase'}
                  {!disabledReason ? (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  ) : null}
                </button>
                <p className="mt-3 text-center font-mono-label text-muted-foreground">
                  Opens your wallet to sign the transaction
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResult && status ? (
        <TransactionResult
          status={status}
          variant="modal"
          details={{ amount, from: truncateAddress(address), hash }}
          onClose={closeResult}
          onRetry={() => {
            reset()
            send(amount)
          }}
        />
      ) : null}
    </section>
  )
}

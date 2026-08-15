'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Check, Loader2, Upload } from 'lucide-react'
import { WiringBadge } from '@/components/app/AppShell'
import { FEATURES, ROUTES, TOKENOMICS } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { truncateAddress, useWallet } from '@/lib/wallet-context'

const WINDOW_OPTIONS = [
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '2 hours', value: 7200 },
  { label: '6 hours', value: 21600 },
] as const

type FormState = {
  name: string
  symbol: string
  description: string
  website: string
  twitter: string
  telegram: string
  windowSeconds: number
  agreed: boolean
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function CreateLaunchForm() {
  const { connected, address, connect } = useWallet()
  const [form, setForm] = useState<FormState>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    windowSeconds: 3600,
    agreed: false,
  })
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const previewSymbol = form.symbol.toUpperCase().slice(0, 6) || 'TKN'
  const previewInitials = previewSymbol.slice(0, 2)

  const canSubmit =
    connected &&
    form.name.trim().length > 0 &&
    previewSymbol.length >= 2 &&
    form.agreed &&
    submitState !== 'loading'

  const windowLabel = useMemo(
    () =>
      WINDOW_OPTIONS.find((o) => o.value === form.windowSeconds)?.label ??
      '1 hour',
    [form.windowSeconds],
  )

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleDeploy = async () => {
    if (!canSubmit) return
    if (!FEATURES.createLaunchDeploy) {
      setSubmitState('loading')
      await new Promise((r) => setTimeout(r, 1200))
      setSubmitState('success')
      return
    }
    // TODO: wire EyesLaunchFactory.createLaunch via wagmi
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Create launch</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Deploy a fair launch
        </h1>
        <p className="mt-3 text-muted-foreground">
          Configure your token and Eyes Window rules. On-chain deploy wiring pending
          on testnet.
        </p>
      </div>

      {!connected ? (
        <div className="rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <button
            type="button"
            onClick={connect}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Connect your wallet
          </button>{' '}
          to create a launch on Base Sepolia testnet.
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Token details
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Token name">
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="My Fair Token"
                  className={inputClass}
                />
              </Field>
              <Field label="Ticker / symbol">
                <input
                  value={form.symbol}
                  onChange={(e) =>
                    update('symbol', e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="FAIR"
                  maxLength={6}
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    update('description', e.target.value.slice(0, 280))
                  }
                  rows={4}
                  placeholder="What makes this launch fair?"
                  className={cn(inputClass, 'resize-none')}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {form.description.length}/280
                </p>
              </Field>
              <Field label="Token image">
                <div className="flex min-h-28 cursor-not-allowed flex-col items-center justify-center rounded-sm border border-dashed border-border bg-background/60 px-4 py-6 text-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    PNG or JPG · max 2MB
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload wiring pending
                  </p>
                </div>
              </Field>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Socials <span className="text-sm font-normal text-muted-foreground">(optional)</span>
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Website URL">
                <input
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field label="X (Twitter)">
                <input
                  value={form.twitter}
                  onChange={(e) => update('twitter', e.target.value)}
                  placeholder="@handle"
                  className={inputClass}
                />
              </Field>
              <Field label="Telegram">
                <input
                  value={form.telegram}
                  onChange={(e) => update('telegram', e.target.value)}
                  placeholder="https://t.me/..."
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Launch rules
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Eyes Window duration">
                <select
                  value={form.windowSeconds}
                  onChange={(e) =>
                    update('windowSeconds', Number(e.target.value))
                  }
                  className={inputClass}
                >
                  {WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  During the Eyes Window, wallet-to-wallet transfers are blocked.
                  Only buys through the pad.
                </p>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Chip>Trading fee: {TOKENOMICS.tradingFee}</Chip>
                <Chip>Fee split: {TOKENOMICS.feeSplit}</Chip>
                <Chip>LP lock: {TOKENOMICS.lpLock}</Chip>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => update('agreed', e.target.checked)}
                className="mt-1 h-4 w-4 rounded-sm border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                I understand this is testnet infrastructure and not financial advice.
              </span>
            </label>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-primary">Preview</span>
              <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-primary/40 bg-primary/10 font-display text-xl font-bold text-primary">
                {previewInitials}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {form.name.trim() || 'Token name'}
              </h3>
              <p className="font-mono-label text-muted-foreground">
                ${previewSymbol}
              </p>
              {form.description ? (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {form.description}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                Eyes Window: {windowLabel}
              </p>
              <ol className="mt-4 w-full space-y-2 text-left text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span> Deploy
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span> Eyes Window
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span> Trading
                </li>
              </ol>
            </div>
          </div>
        </aside>
      </div>

      {submitState === 'success' ? (
        <div className="rounded-sm border border-primary/40 bg-primary/5 p-6 text-center">
          <Check className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 font-display text-lg font-bold text-foreground">
            Launch created (demo)
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Contract wiring pending. Preview saved for{' '}
            {address ? truncateAddress(address) : 'your wallet'}.
          </p>
          <Link
            href={ROUTES.appLaunches}
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            View launches →
          </Link>
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {connected
                ? FEATURES.createLaunchDeploy
                  ? 'Ready to deploy on Base Sepolia'
                  : 'Deploy disabled until factory contract is wired'
                : 'Connect wallet to deploy on Base Sepolia testnet'}
            </p>
            <button
              type="button"
              onClick={handleDeploy}
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:border-primary/70 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying…
                </>
              ) : (
                'Deploy launch'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="font-mono-label text-[0.58rem] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

const inputClass =
  'w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'

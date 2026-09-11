'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Lock } from 'lucide-react'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { cn } from '@/lib/utils'

export function WalletUnlockPanel({
  className,
  compact = false,
  title = 'Unlock your Eyes wallet',
  description = 'Enter your account password to sign transactions.',
}: {
  className?: string
  compact?: boolean
  title?: string
  description?: string
}) {
  const { unlockWallet, walletUnlocked, busy, error } = useEyesAccount()
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletUnlocked) {
      setExpanded(false)
      setPassword('')
      setLocalError(null)
    }
  }, [walletUnlocked])

  if (walletUnlocked) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    try {
      await unlockWallet(password)
      setPassword('')
      setExpanded(false)
    } catch {
      /* provider error */
    }
  }

  if (!expanded) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background',
          compact ? 'px-3 py-2.5' : 'px-4 py-3',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Wallet locked — balance visible, signing disabled</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setLocalError(null)
            setExpanded(true)
          }}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Unlock wallet
        </button>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'rounded-sm border border-primary/30 bg-primary/5',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setPassword('')
            setLocalError(null)
          }}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="font-mono-label text-[0.65rem] text-muted-foreground">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Account password"
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !password}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Unlock
        </button>
      </form>

      {(localError ?? error) ? (
        <p className="mt-2 text-xs text-destructive">{localError ?? error}</p>
      ) : null}
    </section>
  )
}

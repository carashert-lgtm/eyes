'use client'

import { useState } from 'react'
import { Loader2, Lock, LogIn, UserPlus } from 'lucide-react'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

export function EyesAuthPanel({
  className,
  defaultMode = 'login',
}: {
  className?: string
  defaultMode?: Mode
}) {
  const { signup, login, busy, error, signedIn } = useEyesAccount()
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (signedIn) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } catch {
      /* error surfaced via provider */
    }
  }

  return (
    <section
      className={cn(
        'rounded-sm border border-border bg-surface p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">
            {mode === 'signup' ? 'Create your Eyes account' : 'Sign in to Eyes Open'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One email login · one self-custodial wallet · same address every time you return.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <div>
          <label className="font-mono-label text-[0.65rem] text-muted-foreground">Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="font-mono-label text-[0.65rem] text-muted-foreground">Password</label>
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {mode === 'signup' ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Minimum 8 characters. Encrypts your wallet — we never store your raw private key.
            </p>
          ) : null}
        </div>

        {(localError ?? error) ? (
          <p className="text-xs text-destructive">{localError ?? error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'signup' ? (
            <>
              <UserPlus className="h-4 w-4" /> Create account + wallet
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Sign in
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {mode === 'signup' ? 'Already have an account?' : 'New to Eyes Open?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          className="text-primary hover:underline"
        >
          {mode === 'signup' ? 'Sign in' : 'Create account'}
        </button>
      </p>

      <p className="mt-3 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <strong className="text-foreground">This wallet is yours.</strong> Your key is encrypted
        with your password. Back it up from profile after signup. No MetaMask required.
      </p>
    </section>
  )
}

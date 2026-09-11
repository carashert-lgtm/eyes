'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ROUTES } from '@/lib/site-config'

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/eyes-account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Reset failed')
      setMessage(data.message ?? 'Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive">
        Invalid reset link. Request a new one from{' '}
        <Link href="/app/forgot-password" className="underline">
          forgot password
        </Link>
        .
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        Resetting your password clears embedded wallet encryption. Export your private key from Profile first if you
        have not saved it elsewhere.
      </div>
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50"
      />
      <input
        type="password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Set new password
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your Eyes account.</p>
      <Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={ROUTES.appProfile} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ROUTES } from '@/lib/site-config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/eyes-account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setMessage(data.message ?? 'Check your email for reset instructions.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your account email. We will send a secure reset link that expires in one hour.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
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
          Send reset link
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={ROUTES.appProfile} className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

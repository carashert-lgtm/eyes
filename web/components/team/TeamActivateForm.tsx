'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { KeyRound, Lock } from 'lucide-react'
import Link from 'next/link'
import { EyeMark } from '@/components/ui/EyeMark'
import { BRAND, ROUTES } from '@/lib/site-config'

export function TeamActivateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ROUTES.teamPool
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/team/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Activation failed')
        return
      }
      router.push(next.startsWith('/team') ? next : ROUTES.teamPool)
      router.refresh()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-grid opacity-30 mask-fade-b"
      />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Link href={ROUTES.home} className="mb-10 inline-flex items-center gap-2.5">
          <EyeMark className="h-8 w-8 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">{BRAND.name}</span>
        </Link>

        <div className="rounded-sm border border-border bg-surface p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="font-mono-label text-primary">Team Space</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Enter activation code
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            One-time codes are issued by the owner in Discord. After activation you can
            access the team pool dashboard and your allocation status.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="font-mono-label text-muted-foreground">Activation code</span>
              <div className="relative mt-2">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TEAM-XXXXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-sm border border-border bg-background py-3 pl-10 pr-4 font-mono text-sm uppercase tracking-wider text-foreground outline-none ring-primary/30 transition focus:border-primary/50 focus:ring-2"
                />
              </div>
            </label>

            {error ? (
              <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Activating…' : 'Activate Team Space'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need a code? Ask the owner in Discord.
          </p>
        </div>
      </div>
    </div>
  )
}

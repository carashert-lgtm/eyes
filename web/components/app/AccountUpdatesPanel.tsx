'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Mail } from 'lucide-react'
import type { AccountProfile, EmailAlertPrefs } from '@/lib/account-types'
import { cn } from '@/lib/utils'
import { truncateAddress } from '@/lib/address-utils'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { useAppWallet } from '@/hooks/useAppWallet'

type MeResponse = {
  signedIn?: boolean
  email?: string | null
  profile?: AccountProfile | null
}

export function AccountUpdatesPanel({ className }: { className?: string }) {
  const { signedIn, account } = useEyesAccount()
  const { address } = useAppWallet()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [prefs, setPrefs] = useState<EmailAlertPrefs>({
    launches: true,
    presale: true,
    season: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [saved])

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setMe(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/me')
      const data = (await res.json()) as MeResponse
      setMe(data)
      if (data.profile?.account.emailAlerts) {
        setPrefs(data.profile.account.emailAlerts)
      }
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    refresh()
  }, [refresh, signedIn, account?.email])

  const handleSavePrefs = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    setSaved(false)
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      setSaved(true)
      setMessage('Preferences saved — we will email you at your account address.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const email = me?.email ?? account?.email ?? null
  const links = me?.profile?.links
  const walletLabel =
    address ?? links?.walletLinked ? me?.profile?.account.walletAddress : null

  return (
    <section
      id="updates"
      className={cn(
        'scroll-mt-24 rounded-sm border border-border bg-surface p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-border bg-background">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">Email updates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Launch alerts, platform news, and season recaps — sent to your Eyes account email.
          </p>
        </div>
      </div>

      {!signedIn ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Sign in above — we will use the email on your Eyes wallet account. No extra login needed.
        </p>
      ) : loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-sm border border-border bg-background px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">
              {walletLabel
                ? `Wallet ${truncateAddress(walletLabel)} · updates go here`
                : 'Your account email · updates go here'}
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Send me
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['launches', 'New launches'],
                  ['presale', 'Platform news'],
                  ['season', 'Season'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors',
                    prefs[key]
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                    className="sr-only"
                  />
                  {prefs[key] ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={saving}
                className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save preferences
              </button>
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Saved
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {message ? <p className="mt-4 text-xs text-primary">{message}</p> : null}
      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
    </section>
  )
}

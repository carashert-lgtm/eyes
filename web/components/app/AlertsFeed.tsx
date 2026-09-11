'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useEyesBalance } from '@/hooks/useEyesBalance'
import { RETENTION_ENABLED } from '@/lib/retention-config'
import { ROUTES } from '@/lib/site-config'

type AlertRow = {
  id: string
  type: string
  label: string
  launchId?: string
  title: string
  body: string
  createdAt: string
}

export function AlertsFeed({ limit = 5 }: { limit?: number }) {
  const { tier } = useEyesBalance()
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!RETENTION_ENABLED) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/retention/alerts/feed?tierId=${tier.id}`)
      .then(async (r) => {
        const d = (await r.json()) as { ok?: boolean; alerts?: AlertRow[]; error?: string }
        if (cancelled) return
        if (!r.ok || d.ok === false) {
          setAlerts([])
          setError(d.error ?? 'Could not load alerts')
          return
        }
        setAlerts((d.alerts ?? []).slice(0, limit))
      })
      .catch(() => {
        if (!cancelled) {
          setAlerts([])
          setError('Could not load alerts')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tier.id, limit])

  if (!RETENTION_ENABLED) return null

  return (
    <section className="rounded-sm border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-display font-bold text-foreground">Alerts</h2>
        <span className="ml-auto font-mono-label text-[0.58rem] text-muted-foreground">
          {tier.name} tier
        </span>
      </div>
      {loading ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Loading alerts…</p>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-destructive">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">No alerts for your tier yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-5 py-4">
              <p className="text-xs text-primary">{alert.label}</p>
              <p className="mt-1 font-medium text-foreground">{alert.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{alert.body}</p>
              {alert.launchId ? (
                <Link
                  href={`${ROUTES.appLaunches}/${alert.launchId}`}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  View launch →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

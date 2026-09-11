'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Code2, ExternalLink, Frame, Plug, Shield, Trash2, Users } from 'lucide-react'
import type {
  AccountSettings,
  ApiKeyUsageSummary,
  OAuthAppRecord,
  WalletAutoLockMinutes,
} from '@/lib/settings/types'
import { getEnabledLaunchChains } from '@/lib/launch-chains/registry'
import { SITE_URL } from '@/lib/chain-config'
import { RATE_TIERS } from '@/lib/security/rate-limit-tiers'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'

type EmbedLaunchOption = { id: string; name: string; symbol: string }

const LOCK_OPTIONS: { value: WalletAutoLockMinutes; label: string }[] = [
  { value: 0, label: 'Never (manual lock only)' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '24 hours' },
]

export type SettingsTab = 'account' | 'developer' | 'notifications' | 'preferences'

type Props = {
  activeTab: SettingsTab
  settings: AccountSettings | null
  saveSettings: (patch: Partial<AccountSettings>) => Promise<void>
  busy: string | null
  onCreateTeamKey: () => Promise<void>
  setError: (v: string | null) => void
  setMessage: (v: string | null) => void
}

function SectionShell({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: typeof Code2
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-sm border border-border bg-surface p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-5 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function SettingsExtendedSections({
  activeTab,
  settings,
  saveSettings,
  busy,
  onCreateTeamKey,
  setError,
  setMessage,
}: Props) {
  const chains = getEnabledLaunchChains()
  const [embedLaunchId, setEmbedLaunchId] = useState('')
  const [embedLaunchOptions, setEmbedLaunchOptions] = useState<EmbedLaunchOption[]>([])
  const [embedLaunchLabel, setEmbedLaunchLabel] = useState<string | null>(null)
  const [embedIdStatus, setEmbedIdStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle')
  const [usage, setUsage] = useState<ApiKeyUsageSummary[]>([])
  const [oauthApps, setOauthApps] = useState<OAuthAppRecord[]>([])
  const [newOAuthName, setNewOAuthName] = useState('')
  const [newOAuthUri, setNewOAuthUri] = useState('')
  const [newOAuthSecret, setNewOAuthSecret] = useState<string | null>(null)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

  const refreshUsage = useCallback(async () => {
    const res = await fetch('/api/settings/api-keys/usage', { credentials: 'include' })
    const data = (await res.json()) as { usage?: ApiKeyUsageSummary[] }
    if (data.usage) setUsage(data.usage)
  }, [])

  const refreshOAuth = useCallback(async () => {
    const res = await fetch('/api/oauth/apps', { credentials: 'include' })
    const data = (await res.json()) as { apps?: OAuthAppRecord[] }
    if (data.apps) setOauthApps(data.apps)
  }, [])

  useEffect(() => {
    void refreshUsage()
    void refreshOAuth()
  }, [refreshUsage, refreshOAuth])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/launches?limit=20&sort=newest')
        const data = (await res.json()) as { launches?: EmbedLaunchOption[] }
        const launches = data.launches ?? []
        if (cancelled) return
        setEmbedLaunchOptions(launches)
        if (launches[0]?.id) setEmbedLaunchId(launches[0].id)
      } catch {
        /* preview stays empty until launches load */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!embedLaunchId.trim()) {
      setEmbedIdStatus('idle')
      setEmbedLaunchLabel(null)
      return
    }
    let cancelled = false
    setEmbedIdStatus('loading')
    void (async () => {
      try {
        const res = await fetch(`/api/launches/${encodeURIComponent(embedLaunchId.trim())}`)
        const data = (await res.json()) as { launch?: { name: string; symbol: string } }
        if (cancelled) return
        if (res.ok && data.launch) {
          setEmbedIdStatus('valid')
          setEmbedLaunchLabel(`${data.launch.name} ($${data.launch.symbol})`)
        } else {
          setEmbedIdStatus('invalid')
          setEmbedLaunchLabel(null)
        }
      } catch {
        if (!cancelled) {
          setEmbedIdStatus('invalid')
          setEmbedLaunchLabel(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [embedLaunchId])

  const embedUrl = embedLaunchId.trim()
    ? `${SITE_URL}/embed/launch/${encodeURIComponent(embedLaunchId.trim())}`
    : ''
  const embedCode = embedIdStatus === 'valid' && embedUrl
    ? `<iframe src="${embedUrl}" width="380" height="220" frameborder="0" style="border:0;border-radius:8px;overflow:hidden" title="Eyes Open launch"></iframe>`
    : ''

  const handleCreateOAuth = async () => {
    setError(null)
    setNewOAuthSecret(null)
    try {
      const res = await fetch('/api/oauth/apps', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOAuthName,
          redirectUris: [newOAuthUri],
          scopes: ['launches:read'],
        }),
      })
      const data = (await res.json()) as { error?: string; clientSecret?: string; app?: OAuthAppRecord }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (data.clientSecret) setNewOAuthSecret(data.clientSecret)
      setNewOAuthName('')
      setMessage('OAuth app created')
      void refreshOAuth()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleExport = async () => {
    setError(null)
    try {
      const res = await fetch('/api/eyes-account/export', { credentials: 'include' })
      const data = (await res.json()) as { export?: unknown; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Export failed')
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eyes-open-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Account data exported')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const handleDelete = async () => {
    if (!confirm('This permanently deletes your account. This cannot be undone.')) return
    setError(null)
    try {
      const res = await fetch('/api/eyes-account/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteEmail, password: deletePassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      window.location.href = '/'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <>
      {activeTab === 'developer' ? (
      <SectionShell
        id="api-usage"
        icon={BarChart3}
        title="API usage"
        description="Free tier included. Overage burns $EYES from your linked wallet (most of the fee is burned)."
      >
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create an API key to see usage.</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {usage.map((u) => (
              <li key={u.keyId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium capitalize text-foreground">{u.tier} tier</p>
                  <p className="text-xs text-muted-foreground">
                    {u.requestsToday.toLocaleString()} / {u.dailyLimit.toLocaleString()} today
                    {u.overageTokensBurned > 0 ? ` · ${u.overageTokensBurned} $EYES burned` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {RATE_TIERS[u.tier]?.requestsPerMinute ?? 120}/min
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Pro tier upgrades coming soon — contact support for early access. GraphQL:{' '}
          <code className="text-foreground">POST {SITE_URL}/api/graphql</code>
        </p>
      </SectionShell>
      ) : null}

      {activeTab === 'developer' ? (
      <SectionShell
        id="embed-widget"
        icon={Frame}
        title="Embed widget"
        description="Put a live Eyes Open launch card on your website, blog, or landing page. Visitors see your token name, phase, and a button to open the full launch."
      >
        <div className="rounded-sm border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How to use</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Pick your launch from the dropdown.</li>
            <li>Check the live preview — that is exactly what appears on your site.</li>
            <li>Copy the embed code and paste it into any HTML editor (Webflow, Notion, GitHub Pages, etc.).</li>
          </ol>
        </div>

        {embedLaunchOptions.length > 0 ? (
          <label className="block text-sm text-muted-foreground">
            Choose launch
            <select
              value={embedLaunchId}
              onChange={(e) => setEmbedLaunchId(e.target.value)}
              className={cn(inputClass, 'mt-1.5')}
            >
              {embedLaunchOptions.map((launch) => (
                <option key={launch.id} value={launch.id}>
                  {launch.name} (${launch.symbol})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">
            No launches available yet.{' '}
            <Link href="/app/create" className="text-primary hover:underline">
              Create a launch
            </Link>{' '}
            first, then come back here to embed it.
          </p>
        )}
        {embedIdStatus === 'loading' ? (
          <p className="text-xs text-muted-foreground">Checking launch…</p>
        ) : null}
        {embedIdStatus === 'valid' && embedLaunchLabel ? (
          <p className="text-xs text-foreground">
            Ready to embed: <span className="font-medium">{embedLaunchLabel}</span>
          </p>
        ) : null}
        {embedIdStatus === 'invalid' ? (
          <p className="text-xs text-destructive">
            Could not load that launch. Try picking another from the list.
          </p>
        ) : null}

        <div>
          <p className="text-sm font-medium text-foreground">Live preview</p>
          <p className="mt-0.5 text-xs text-muted-foreground">What visitors will see on your site.</p>
          <div className="mx-auto mt-3 max-w-sm overflow-hidden rounded-sm border border-border bg-background">
            {embedIdStatus === 'valid' && embedUrl ? (
              <iframe
                src={embedUrl}
                width="100%"
                height="220"
                className="max-w-full border-0"
                title="Launch embed preview"
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
                {embedIdStatus === 'loading'
                  ? 'Loading preview…'
                  : 'Pick a launch above to preview the embed.'}
              </div>
            )}
          </div>
          {embedIdStatus === 'valid' && embedUrl ? (
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open embed in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        {embedCode ? (
          <div>
            <p className="text-sm font-medium text-foreground">Embed code</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste this into your site HTML. You can change <code className="text-foreground">width</code> and{' '}
              <code className="text-foreground">height</code> to fit your layout.
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-sm bg-muted/40 p-3 text-xs text-foreground">
              {embedCode}
            </pre>
          </div>
        ) : null}
        <button
          type="button"
          disabled={!embedCode}
          onClick={() => {
            void navigator.clipboard.writeText(embedCode).then(() => {
              setMessage('Embed code copied — paste it into your website HTML')
            })
          }}
          className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy embed code
        </button>
      </SectionShell>
      ) : null}

      {activeTab === 'developer' ? (
      <SectionShell
        id="webhook-filters"
        icon={Code2}
        title="Webhook filters"
        description="Only receive events you care about."
      >
        <div className="flex flex-wrap gap-2">
          {chains.map((c) => {
            const active = settings?.webhookFilterChains.includes(c.key) ?? false
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  if (!settings) return
                  const next = active
                    ? settings.webhookFilterChains.filter((k) => k !== c.key)
                    : [...settings.webhookFilterChains, c.key]
                  void saveSettings({ webhookFilterChains: next })
                }}
                className={cn(
                  'rounded-sm border px-3 py-1.5 text-xs',
                  active ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border text-muted-foreground',
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={settings?.webhookOnlyMine ?? false}
            onChange={(e) => void saveSettings({ webhookOnlyMine: e.target.checked })}
          />
          Only my launches
        </label>
      </SectionShell>
      ) : null}

      {activeTab === 'account' ? (
      <SectionShell
        id="wallet-lock"
        icon={Shield}
        title="Wallet auto-lock"
        description="Automatically lock your signing session after idle time."
      >
        <select
          value={settings?.walletAutoLockMinutes ?? 15}
          onChange={(e) =>
            void saveSettings({ walletAutoLockMinutes: Number(e.target.value) as WalletAutoLockMinutes })
          }
          className={inputClass}
        >
          {LOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </SectionShell>
      ) : null}

      {activeTab === 'notifications' ? (
      <SectionShell
        id="discord-dm"
        icon={Plug}
        title="Discord DM alerts"
        description="Requires Discord linked on Profile. DMs when enabled."
      >
        {(
          [
            ['discordDmLaunches', 'New launches'],
            ['discordDmPresale', 'Platform news'],
            ['discordDmSeason', 'Season recaps'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={settings?.[key] ?? false}
              onChange={(e) => void saveSettings({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </SectionShell>
      ) : null}

      {activeTab === 'developer' ? (
      <SectionShell
        id="team-keys"
        icon={Users}
        title="Team API keys"
        description="Free shared keys for agencies — prefix eok_team_."
      >
        <button
          type="button"
          onClick={() => void onCreateTeamKey().then(() => refreshUsage())}
          disabled={busy === 'team-key'}
          className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
        >
          Create team key
        </button>
        <p className="text-xs text-muted-foreground">
          The new key appears above in Developer API — copy it immediately.
        </p>
      </SectionShell>
      ) : null}

      {activeTab === 'developer' ? (
      <SectionShell
        id="oauth-apps"
        icon={Plug}
        title="OAuth apps"
        description="Let third-party apps request access without raw API keys."
      >
        <input
          value={newOAuthName}
          onChange={(e) => setNewOAuthName(e.target.value)}
          placeholder="App name"
          className={inputClass}
        />
        <input
          value={newOAuthUri}
          onChange={(e) => setNewOAuthUri(e.target.value)}
          placeholder="https://your-app.com/callback"
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleCreateOAuth}
          disabled={!newOAuthName.trim() || !newOAuthUri.trim()}
          className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
        >
          Register OAuth app
        </button>
        {newOAuthSecret ? (
          <code className="block break-all rounded-sm bg-primary/5 p-3 text-xs text-primary">{newOAuthSecret}</code>
        ) : null}
        {oauthApps.length > 0 ? (
          <ul className="text-sm text-muted-foreground">
            {oauthApps.map((a) => (
              <li key={a.id}>
                {a.name} · <code className="text-foreground">{a.clientId}</code>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionShell>
      ) : null}

      {activeTab === 'developer' ? (
      <SectionShell
        id="integrations"
        icon={Plug}
        title="Automation"
        description="Zapier and Make work via launch webhooks."
      >
        <Link href="/app/integrations" className="text-sm text-primary hover:underline">
          Open integrations guide →
        </Link>
      </SectionShell>
      ) : null}

      {activeTab === 'account' ? (
      <SectionShell
        id="account-data"
        icon={Trash2}
        title="Account data"
        description="Export is encouraged. Deletion is permanent and discouraged."
      >
        <button
          type="button"
          onClick={handleExport}
          className="mr-2 inline-flex min-h-9 items-center rounded-sm border border-border px-4 text-sm text-foreground"
        >
          Export my data (JSON)
        </button>
        <details className="mt-4 rounded-sm border border-destructive/30 bg-destructive/5 p-4">
          <summary className="cursor-pointer text-sm font-medium text-destructive">Delete account permanently</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            We would rather you export and stay. Deletion revokes API keys and removes your profile.
          </p>
          <input
            value={deleteEmail}
            onChange={(e) => setDeleteEmail(e.target.value)}
            placeholder="Type your email to confirm"
            className={cn(inputClass, 'mt-3')}
          />
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Password"
            className={cn(inputClass, 'mt-2')}
          />
          <button
            type="button"
            onClick={handleDelete}
            className="mt-3 text-sm text-destructive hover:underline"
          >
            Delete my account
          </button>
        </details>
      </SectionShell>
      ) : null}
    </>
  )
}

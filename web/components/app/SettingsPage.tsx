'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Copy,
  Key,
  Loader2,
  Lock,
  Plug,
  Radio,
  Shield,
  Trash2,
  Webhook,
} from 'lucide-react'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { useAppWallet } from '@/hooks/useAppWallet'
import { encryptPrivateKey } from '@/lib/embedded-wallet/crypto'
import { getEnabledLaunchChains } from '@/lib/launch-chains/registry'
import { SITE_URL } from '@/lib/chain-config'
import { ROUTES } from '@/lib/site-config'
import type { AccountSettings, ApiKeyRecord, ApiKeyScope } from '@/lib/settings/types'
import { cn } from '@/lib/utils'
import { truncateAddress } from '@/lib/address-utils'
import {
  SettingsExtendedSections,
  type SettingsTab,
} from '@/components/app/SettingsExtendedSections'

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'developer', label: 'Developer' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences', label: 'Preferences' },
]

type SettingsResponse = {
  ok?: boolean
  email?: string
  walletAddress?: string | null
  solanaAddress?: string | null
  settings?: AccountSettings
  error?: string
}

type EmailPrefs = { launches: boolean; presale: boolean; season: boolean }

function Section({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: typeof Key
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

const inputClass =
  'w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20'

const apiFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: 'include' })

function applySettingsToForm(
  settings: AccountSettings,
  setters: {
    setSettings: (s: AccountSettings) => void
    setWebhookUrl: (v: string) => void
    setWebhookSecret: (v: string) => void
    setDefaultChain: (v: string) => void
    setPublicProfile: (v: boolean) => void
  },
) {
  setters.setSettings(settings)
  setters.setWebhookUrl(settings.launchWebhookUrl ?? '')
  setters.setWebhookSecret(settings.launchWebhookSecret ?? '')
  setters.setDefaultChain(settings.defaultLaunchChain)
  setters.setPublicProfile(settings.publicCreatorProfile)
}

export function SettingsPage() {
  const { signedIn, account, logout, walletUnlocked, applyPasswordChange } = useEyesAccount()
  const { address, embeddedSession } = useAppWallet()

  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AccountSettings | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [prefs, setPrefs] = useState<EmailPrefs>({ launches: true, presale: true, season: true })
  const [discord, setDiscord] = useState<{ linked?: boolean; username?: string; pendingCode?: string | null }>({})

  const [keyName, setKeyName] = useState('')
  const [keyScopes, setKeyScopes] = useState<ApiKeyScope[]>(['launches:read', 'account:read'])
  const [newRawKey, setNewRawKey] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [defaultChain, setDefaultChain] = useState('base')
  const [publicProfile, setPublicProfile] = useState(true)

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiBase = useMemo(() => `${SITE_URL.replace(/\/$/, '')}/api/v1`, [])
  const chains = useMemo(() => getEnabledLaunchChains(), [])

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [settingsRes, keysRes, meRes] = await Promise.all([
        apiFetch('/api/settings'),
        apiFetch('/api/settings/api-keys'),
        apiFetch('/api/account/me'),
      ])
      const settingsData = (await settingsRes.json()) as SettingsResponse
      const keysData = (await keysRes.json()) as { keys?: ApiKeyRecord[]; error?: string }
      const meData = (await meRes.json()) as {
        email?: string
        profile?: { account?: { emailAlerts?: EmailPrefs }; links?: { discordLinked?: boolean } }
      }

      if (!settingsRes.ok) {
        throw new Error(settingsData.error ?? 'Could not load settings')
      }
      if (!keysRes.ok) {
        throw new Error(keysData.error ?? 'Could not load API keys')
      }

      if (settingsData.ok && settingsData.settings) {
        applySettingsToForm(settingsData.settings, {
          setSettings,
          setWebhookUrl,
          setWebhookSecret,
          setDefaultChain,
          setPublicProfile,
        })
        setEmail(settingsData.email ?? account?.email ?? null)
      }

      if (keysData.keys) setKeys(keysData.keys)
      const emailAlerts = meData.profile?.account?.emailAlerts
      if (emailAlerts) setPrefs(emailAlerts)
      setDiscord({ linked: meData.profile?.links?.discordLinked })

      if (address) {
        const linkRes = await fetch(`/api/wallet/discord-link?wallet=${encodeURIComponent(address)}`)
        const linkData = (await linkRes.json()) as { linked?: boolean; username?: string; pendingCode?: string }
        setDiscord((prev) => ({ ...prev, ...linkData }))
      }
    } catch {
      setError('Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [signedIn, account?.email, address])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveSettings = async (patch: Partial<AccountSettings>) => {
    setBusy('settings')
    setError(null)
    setMessage(null)
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = (await res.json()) as { settings?: AccountSettings; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      if (data.settings) {
        applySettingsToForm(data.settings, {
          setSettings,
          setWebhookUrl,
          setWebhookSecret,
          setDefaultChain,
          setPublicProfile,
        })
      }
      setMessage('Settings saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletUnlocked || !embeddedSession?.privateKey || !address) {
      setError('Unlock your wallet on Profile before changing password')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setBusy('password')
    setError(null)
    setMessage(null)
    try {
      const pk = embeddedSession.privateKey.replace(/^0x/, '')
      const enc = await encryptPrivateKey(pk, newPassword)
      const res = await apiFetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          walletEncSalt: enc.saltB64,
          walletEncIv: enc.ivB64,
          walletEncCiphertext: enc.ciphertextB64,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Password change failed')
      await applyPasswordChange(newPassword, enc)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated — your wallet now uses the new password')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setBusy(null)
    }
  }

  const handleCreateKey = async () => {
    const name = keyName.trim()
    if (!name) {
      setError('Key name required')
      return
    }
    setBusy('key')
    setError(null)
    setMessage(null)
    setNewRawKey(null)
    try {
      const res = await apiFetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes: keyScopes }),
      })
      const data = (await res.json()) as { rawKey?: string; error?: string; key?: ApiKeyRecord }
      if (!res.ok) throw new Error(data.error ?? 'Could not create key')
      if (data.rawKey) setNewRawKey(data.rawKey)
      if (data.key) {
        setKeys((prev) => [data.key!, ...prev.filter((k) => k.id !== data.key!.id)])
      } else {
        const listRes = await apiFetch('/api/settings/api-keys')
        const listData = (await listRes.json()) as { keys?: ApiKeyRecord[]; error?: string }
        if (listRes.ok && listData.keys) setKeys(listData.keys)
      }
      setKeyName('')
      setMessage('API key created — copy it now')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create key')
    } finally {
      setBusy(null)
    }
  }

  const handleCreateTeamKey = async () => {
    setBusy('team-key')
    setError(null)
    setMessage(null)
    setNewRawKey(null)
    try {
      const res = await apiFetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agency team key',
          scopes: ['launches:read', 'account:read'],
          kind: 'team',
        }),
      })
      const data = (await res.json()) as { rawKey?: string; error?: string; key?: ApiKeyRecord }
      if (!res.ok) throw new Error(data.error ?? 'Could not create team key')
      if (data.rawKey) setNewRawKey(data.rawKey)
      if (data.key) {
        setKeys((prev) => [data.key!, ...prev.filter((k) => k.id !== data.key!.id)])
      } else {
        const listRes = await apiFetch('/api/settings/api-keys')
        const listData = (await listRes.json()) as { keys?: ApiKeyRecord[]; error?: string }
        if (listRes.ok && listData.keys) setKeys(listData.keys)
      }
      setActiveTab('developer')
      setMessage('Team API key created — copy it now')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create team key')
    } finally {
      setBusy(null)
    }
  }

  const handleRevokeKey = async (id: string) => {
    setBusy(`revoke-${id}`)
    try {
      const res = await apiFetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Revoke failed')
      setKeys((prev) => prev.filter((k) => k.id !== id))
      setMessage('API key revoked')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed')
    } finally {
      setBusy(null)
    }
  }

  const handleSavePrefs = async () => {
    setBusy('prefs')
    try {
      const res = await apiFetch('/api/account/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      setMessage('Email preferences saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  const handleDiscordLink = async () => {
    if (!address) return
    setBusy('discord')
    try {
      const res = await fetch('/api/wallet/discord-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      })
      const data = (await res.json()) as { code?: string; error?: string; instructions?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not generate link code')
      setDiscord((prev) => ({ ...prev, pendingCode: data.code ?? null }))
      setMessage(data.instructions ?? 'Discord link code generated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discord link failed')
    } finally {
      setBusy(null)
    }
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard')
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg rounded-sm border border-border bg-surface p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage your account, developer API keys, webhooks, and notifications.
        </p>
        <Link
          href={ROUTES.appProfile}
          className="mt-6 inline-flex min-h-10 items-center rounded-sm border border-primary/40 bg-primary/10 px-5 text-sm font-medium text-primary"
        >
          Go to Profile →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="font-mono-label text-primary">Settings</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
          Account & developer tools
        </h1>
        <p className="mt-3 text-muted-foreground">
          API keys, launch webhooks, security, and preferences — built for creators who want
          programmatic access no other launchpad offers.
        </p>
      </div>

      {(message || error) && (
        <div
          className={cn(
            'rounded-sm border px-4 py-3 text-sm',
            error
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-primary/30 bg-primary/5 text-primary',
          )}
        >
          {error ?? message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      ) : (
        <>
          <div
            className="flex gap-1 overflow-x-auto border-b border-border pb-px"
            role="tablist"
            aria-label="Settings sections"
          >
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 rounded-t-sm border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-w-0 space-y-6">
            {activeTab === 'account' ? (
            <Section
              id="account"
              icon={Shield}
              title="Account & security"
              description="Your Eyes identity and wallet password."
            >
              <div className="rounded-sm border border-border bg-background p-4 text-sm">
                <p className="font-medium text-foreground">{email}</p>
                {address ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wallet {truncateAddress(address)}
                    {settings ? null : ''}
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <p className="text-sm font-medium text-foreground">Change password</p>
                {!walletUnlocked ? (
                  <p className="text-xs text-amber-400">
                    Unlock your wallet on Profile first — your encrypted key must be in memory to
                    re-wrap with a new password.
                  </p>
                ) : null}
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="New password (8+ characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={busy === 'password' || !walletUnlocked}
                  className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {busy === 'password' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update password
                </button>
              </form>

              <button
                type="button"
                onClick={() => logout()}
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Sign out
              </button>
            </Section>
            ) : null}

            {activeTab === 'developer' ? (
            <Section
              id="developer-api"
              icon={Key}
              title="Developer API"
              description="The first fair-launch API — read live launches across Base, Ethereum, and Solana."
            >
              <div className="rounded-sm border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick start</p>
                <pre className="mt-2 overflow-x-auto rounded-sm bg-muted/40 p-3 text-xs text-foreground">
{`curl -H "Authorization: Bearer YOUR_KEY" \\
  "${apiBase}/launches?limit=10"`}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(`${apiBase}/docs`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy docs URL
                  </button>
                  <a href={`${apiBase}/docs`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    Open API docs →
                  </a>
                </div>
              </div>

              {newRawKey ? (
                <div className="rounded-sm border border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-foreground">New API key — copy now</p>
                  <code className="mt-2 block break-all text-xs text-primary">{newRawKey}</code>
                  <button
                    type="button"
                    onClick={() => copyText(newRawKey)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                  >
                    <Copy className="h-3 w-3" /> Copy key
                  </button>
                </div>
              ) : null}

              <div className="space-y-3">
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key name (e.g. Mobile app, Dashboard bot)"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  {(['launches:read', 'launches:write', 'account:read'] as ApiKeyScope[]).map((scope) => (
                    <label
                      key={scope}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-1.5 text-xs',
                        keyScopes.includes(scope)
                          ? 'border-primary/40 bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={keyScopes.includes(scope)}
                        onChange={(e) =>
                          setKeyScopes((prev) =>
                            e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                          )
                        }
                        className="sr-only"
                      />
                      {scope}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={busy === 'key' || !keyName.trim()}
                  className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
                >
                  {busy === 'key' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create API key
                </button>
              </div>

              {keys.length > 0 ? (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {keys.map((key) => (
                    <li key={key.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {key.keyPrefix}… · {key.scopes.join(', ')}
                          {key.lastUsedAt ? ` · used ${new Date(key.lastUsedAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={busy === `revoke-${key.id}`}
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No API keys yet.</p>
              )}
            </Section>
            ) : null}

            {activeTab === 'developer' ? (
            <Section
              id="webhooks"
              icon={Webhook}
              title="Launch webhooks"
              description="Get POST callbacks when your launches register on discovery — wire bots, dashboards, or Discord relays."
            >
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/eyes/webhook"
                className={inputClass}
              />
              <input
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Signing secret (optional)"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    saveSettings({
                      launchWebhookUrl: webhookUrl.trim() || null,
                      launchWebhookSecret: webhookSecret.trim() || null,
                    })
                  }
                  disabled={busy === 'settings'}
                  className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
                >
                  Save webhook
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setBusy('webhook-test')
                    try {
                      await saveSettings({
                        launchWebhookUrl: webhookUrl.trim() || null,
                        launchWebhookSecret: webhookSecret.trim() || null,
                      })
                      const res = await apiFetch('/api/settings/webhook-test', { method: 'POST' })
                      const data = (await res.json()) as { error?: string; status?: number; delivered?: boolean }
                      if (!res.ok) throw new Error(data.error ?? 'Test failed')
                      setMessage(`Webhook test sent — HTTP ${data.status}`)
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Webhook test failed')
                    } finally {
                      setBusy(null)
                    }
                  }}
                  disabled={busy === 'webhook-test' || !webhookUrl.trim()}
                  className="inline-flex min-h-9 items-center rounded-sm border border-border px-4 text-sm text-foreground disabled:opacity-50"
                >
                  Send test event
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Events: <code className="text-foreground">launch.discovery_registered</code>,{' '}
                <code className="text-foreground">webhook.test</code>. Signed with{' '}
                <code className="text-foreground">X-Eyes-Signature</code> when a secret is set.
              </p>
            </Section>
            ) : null}

            {activeTab === 'notifications' ? (
            <Section
              id="notifications"
              icon={Radio}
              title="Email notifications"
              description="What we send to your account email."
            >
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
                      'inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm',
                      prefs[key]
                        ? 'border-primary/40 bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground',
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
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={busy === 'prefs'}
                className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
              >
                Save email preferences
              </button>
            </Section>
            ) : null}

            {activeTab === 'preferences' ? (
            <Section
              id="connections"
              icon={Plug}
              title="Connections"
              description="Link external accounts to your Eyes wallet."
            >
              {discord.linked ? (
                <p className="text-sm text-foreground">
                  Discord linked{discord.username ? `: ${discord.username}` : ''} ✓
                </p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDiscordLink}
                    disabled={busy === 'discord' || !address}
                    className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
                  >
                    Generate Discord link code
                  </button>
                  {discord.pendingCode ? (
                    <p className="text-sm text-muted-foreground">
                      In Discord run:{' '}
                      <code className="text-foreground">!linkwallet {discord.pendingCode}</code>
                    </p>
                  ) : null}
                </div>
              )}
            </Section>
            ) : null}

            {activeTab === 'preferences' ? (
            <Section
              id="defaults"
              icon={Lock}
              title="Launch defaults"
              description="Pre-select your preferred network and visibility on the create page."
            >
              <label className="block text-sm font-medium text-foreground">Default launch network</label>
              <select
                value={defaultChain}
                onChange={(e) => setDefaultChain(e.target.value)}
                className={inputClass}
              >
                {chains.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => setPublicProfile(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                Show my launches on public creator feeds (when enabled platform-wide)
              </label>
              <button
                type="button"
                onClick={() =>
                  saveSettings({
                    defaultLaunchChain: defaultChain as AccountSettings['defaultLaunchChain'],
                    publicCreatorProfile: publicProfile,
                  })
                }
                disabled={busy === 'settings'}
                className="inline-flex min-h-9 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary disabled:opacity-50"
              >
                Save defaults
              </button>
            </Section>
            ) : null}

            <SettingsExtendedSections
              activeTab={activeTab}
              settings={settings}
              saveSettings={saveSettings}
              busy={busy}
              onCreateTeamKey={handleCreateTeamKey}
              setError={setError}
              setMessage={setMessage}
            />
          </div>
        </>
      )}
    </div>
  )
}

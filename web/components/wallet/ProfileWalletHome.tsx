'use client'

import { useState } from 'react'
import { Loader2, LogOut, Shield, Download, Wallet } from 'lucide-react'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { useAppWallet } from '@/hooks/useAppWallet'
import { useUnifiedWalletBalances } from '@/hooks/useUnifiedWalletBalances'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'
import { getLaunchChain } from '@/lib/launch-chains/registry'
import { stakeTierForBalance } from '@/lib/retention-config'
import { hasEnoughEthForGas, MIN_ETH_GAS_FOR_LAUNCH } from '@/lib/wallet-errors'
import { MIN_SOL_GAS_FOR_LAUNCH } from '@/lib/create-launch-gates'
import { cn } from '@/lib/utils'
import { WalletUnlockPanel } from '@/components/wallet/WalletUnlockPanel'
import { UniversalWalletReceive } from '@/components/wallet/UniversalWalletReceive'
import { UniversalWalletSend } from '@/components/wallet/UniversalWalletSend'

export function ProfileWalletHome({
  className,
  compact,
  launchChainKey = 'base',
}: {
  className?: string
  compact?: boolean
  launchChainKey?: LaunchChainKey
}) {
  const launchChain = getLaunchChain(launchChainKey)
  const { account, signedIn, walletUnlocked, logout, exportPrivateKey, lockWallet, busy } =
    useEyesAccount()
  const { address, hasWallet, solanaAddress } = useAppWallet()
  const displaySolana = solanaAddress ?? account?.solanaAddress ?? null
  const { eyesBalance, eyesBalanceFormatted, nativeBalances, isLoading, isError, refetch } =
    useUnifiedWalletBalances()
  const nativeBalanceMap = Object.fromEntries(
    nativeBalances.map((row) => [row.chain, row.balance]),
  ) as Record<LaunchChainKey, number>
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPass, setExportPass] = useState('')
  const [exportKey, setExportKey] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)

  const tier = stakeTierForBalance(eyesBalance)
  const activeNative = nativeBalances.find((b) => b.chain === launchChainKey)
  const hasGasForLaunch =
    launchChainKey === 'solana'
      ? (activeNative?.balance ?? 0) >= MIN_SOL_GAS_FOR_LAUNCH
      : hasEnoughEthForGas(activeNative?.balance ?? 0)

  async function handleExport(e: React.FormEvent) {
    e.preventDefault()
    setExportBusy(true)
    setExportError(null)
    try {
      const key = await exportPrivateKey(exportPass)
      setExportKey(key)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportBusy(false)
    }
  }

  if (!signedIn || !account) return null

  return (
    <section
      className={cn(
        'rounded-sm border border-primary/25 bg-surface',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Universal Eyes wallet</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{account.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {walletUnlocked ? (
            <button
              type="button"
              onClick={() => lockWallet()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Shield className="h-3.5 w-3.5" /> Lock wallet
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Log out
          </button>
        </div>
      </div>

      {walletUnlocked ? (
        <p className="mt-4 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          One wallet for every launch network. Pick the network tab that matches where you are
          sending from — Base for $EYES and ETH, Ethereum for mainnet ETH, Solana for SOL. You can
          send funds out to any external wallet anytime.
        </p>
      ) : (
        <WalletUnlockPanel className="mt-4" compact={compact} />
      )}

      {address ? (
        <UniversalWalletReceive
          className="mt-4"
          evmAddress={address}
          solanaAddress={displaySolana}
          defaultNetwork={launchChainKey}
          compact={compact}
        />
      ) : null}

      <UniversalWalletSend
        className="mt-4"
        walletUnlocked={walletUnlocked}
        eyesBalance={eyesBalance}
        nativeBalances={nativeBalanceMap}
        defaultNetwork={launchChainKey}
        onSent={() => void refetch()}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-border bg-background px-4 py-3">
          <p className="font-mono-label text-[0.65rem] text-muted-foreground">$EYES on Base</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {hasWallet ? (isLoading ? '…' : isError ? 'Error' : eyesBalanceFormatted) : '—'}
          </p>
        </div>
        {nativeBalances.map((row) => (
          <div
            key={row.chain}
            className={cn(
              'rounded-sm border bg-background px-4 py-3',
              row.chain === launchChainKey ? 'border-primary/40' : 'border-border',
            )}
          >
            <p className="font-mono-label text-[0.65rem] text-muted-foreground">{row.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">
              {hasWallet ? (isLoading ? '…' : isError ? 'Error' : row.formatted) : '—'}
            </p>
            {row.chain === launchChainKey && hasWallet && !isLoading && !isError && !hasGasForLaunch ? (
              <p className="mt-1 text-[0.65rem] text-destructive">
                Send ≥{launchChainKey === 'solana' ? MIN_SOL_GAS_FOR_LAUNCH : MIN_ETH_GAS_FOR_LAUNCH}{' '}
                {launchChain.nativeSymbol} on {launchChain.label}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-sm border border-border bg-background px-4 py-3">
        <p className="font-mono-label text-[0.65rem] text-muted-foreground">Stake tier</p>
        <p className="mt-1 font-display text-lg font-bold text-foreground">
          {hasWallet && !isLoading && !isError ? `${tier.badge} ${tier.name}` : hasWallet && isLoading ? '…' : '—'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setExportOpen((v) => !v)
            setExportKey(null)
            setExportPass('')
            setExportError(null)
          }}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" /> Export private key
        </button>
      </div>

      {exportOpen ? (
        <form onSubmit={handleExport} className="mt-4 space-y-2 rounded-sm border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">
            Re-enter your password to reveal your private key. Never share it with anyone.
          </p>
          <input
            type="password"
            value={exportPass}
            onChange={(e) => setExportPass(e.target.value)}
            placeholder="Account password"
            className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm"
          />
          {exportError ? <p className="text-xs text-destructive">{exportError}</p> : null}
          {exportKey ? (
            <code className="block break-all rounded-sm border border-destructive/30 bg-destructive/5 p-2 text-xs text-foreground">
              {exportKey}
            </code>
          ) : null}
          <button
            type="submit"
            disabled={exportBusy || !exportPass}
            className="inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
          >
            {exportBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Confirm export
          </button>
        </form>
      ) : null}
    </section>
  )
}

/** @deprecated use ProfileWalletHome */
export function WalletPanel(props: { className?: string; compact?: boolean }) {
  return <ProfileWalletHome {...props} />
}

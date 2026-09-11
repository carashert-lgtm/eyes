'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Loader2, Send } from 'lucide-react'
import { isAddress, parseEther, parseUnits, type Address } from 'viem'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { cn } from '@/lib/utils'
import { useEyesWalletSigning } from '@/hooks/useEyesWalletSigning'
import { useSolanaWalletSigning } from '@/hooks/useSolanaWalletSigning'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import { isValidSolanaAddress } from '@/lib/eyes-account/solana-address'
import { formatWalletTxError } from '@/lib/wallet-errors'
import type { LaunchEvmChainKey } from '@/lib/viem-chain'
import {
  explorerTxUrlForNetwork,
  sendAssetOptionsForNetwork,
  WALLET_NETWORK_OPTIONS,
  type WalletNetworkKey,
  type WalletSendAssetKey,
} from '@/lib/wallet-unified'

const NATIVE_GAS_RESERVE: Record<WalletNetworkKey, number> = {
  base: 0.0005,
  ethereum: 0.002,
  solana: 0.001,
}

type UniversalWalletSendProps = {
  walletUnlocked: boolean
  eyesBalance: number
  nativeBalances: Record<WalletNetworkKey, number>
  defaultNetwork?: WalletNetworkKey
  onSent?: () => void
  className?: string
}

function parseAmount(raw: string, decimals: number): bigint | null {
  const trimmed = raw.trim()
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null
  try {
    return decimals === 18 ? parseEther(trimmed) : parseUnits(trimmed, decimals)
  } catch {
    return null
  }
}

export function UniversalWalletSend({
  walletUnlocked,
  eyesBalance,
  nativeBalances,
  defaultNetwork = 'base',
  onSent,
  className,
}: UniversalWalletSendProps) {
  const [network, setNetwork] = useState<WalletNetworkKey>(defaultNetwork)
  const [assetKey, setAssetKey] = useState<WalletSendAssetKey>('native')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const baseSigning = useEyesWalletSigning('base')
  const ethSigning = useEyesWalletSigning('ethereum')
  const solSigning = useSolanaWalletSigning()

  const assetOptions = sendAssetOptionsForNetwork(network)
  const activeAsset =
    assetOptions.find((option) => option.key === assetKey) ?? assetOptions[0]!

  const availableBalance = useMemo(() => {
    if (assetKey === 'eyes') return eyesBalance
    return nativeBalances[network] ?? 0
  }, [assetKey, eyesBalance, nativeBalances, network])

  const destinationValid = useMemo(() => {
    const trimmed = toAddress.trim()
    if (!trimmed) return false
    if (network === 'solana') return isValidSolanaAddress(trimmed)
    return isAddress(trimmed)
  }, [network, toAddress])

  function resetForm() {
    setToAddress('')
    setAmount('')
    setError(null)
    setTxHash(null)
  }

  function handleNetworkChange(next: WalletNetworkKey) {
    setNetwork(next)
    setAssetKey('native')
    resetForm()
  }

  function handleMax() {
    if (assetKey === 'eyes') {
      setAmount(String(Math.floor(eyesBalance)))
      return
    }
    const reserve = NATIVE_GAS_RESERVE[network]
    const max = Math.max(0, (nativeBalances[network] ?? 0) - reserve)
    setAmount(max.toFixed(network === 'solana' ? 6 : 6).replace(/\.?0+$/, '') || '0')
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTxHash(null)

    if (!walletUnlocked) {
      setError('Unlock your Eyes wallet to send funds.')
      return
    }
    if (!destinationValid) {
      setError(network === 'solana' ? 'Enter a valid Solana address.' : 'Enter a valid 0x address.')
      return
    }

    const trimmedAmount = amount.trim()
    if (!trimmedAmount || Number(trimmedAmount) <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (Number(trimmedAmount) > availableBalance) {
      setError('Amount exceeds your available balance.')
      return
    }

    setBusy(true)
    try {
      if (network === 'solana') {
        if (!solSigning.canSign) throw new Error('Unlock your Eyes wallet first')
        const lamports = Math.floor(Number(trimmedAmount) * LAMPORTS_PER_SOL)
        if (lamports <= 0) throw new Error('Amount too small.')
        const sig = await solSigning.signAndSend(async (_connection, payer) => {
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: payer,
              toPubkey: new PublicKey(toAddress.trim()),
              lamports,
            }),
          )
          return tx
        })
        setTxHash(sig)
      } else {
        const chainKey = network as LaunchEvmChainKey
        const signing = chainKey === 'ethereum' ? ethSigning : baseSigning
        if (!signing.canSign) throw new Error('Unlock your Eyes wallet first')

        if (assetKey === 'eyes') {
          const token = getEyesTokenAddress()
          if (!token) throw new Error('$EYES token is not configured.')
          const amountWei = parseAmount(trimmedAmount, 18)
          if (!amountWei || amountWei <= BigInt(0)) throw new Error('Invalid amount.')
          const hash = await signing.transferErc20(token as Address, toAddress.trim() as Address, amountWei)
          setTxHash(hash)
        } else {
          const amountWei = parseAmount(trimmedAmount, 18)
          if (!amountWei || amountWei <= BigInt(0)) throw new Error('Invalid amount.')
          const hash = await signing.sendNative(toAddress.trim() as Address, amountWei)
          setTxHash(hash)
        }
      }

      setAmount('')
      onSent?.()
    } catch (err) {
      setError(formatWalletTxError(err))
    } finally {
      setBusy(false)
    }
  }

  const explorerUrl = txHash ? explorerTxUrlForNetwork(network, txHash) : null

  return (
    <div className={cn('rounded-sm border border-border bg-background p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono-label text-[0.65rem] text-muted-foreground">Send from wallet</p>
        <div className="flex flex-wrap gap-1">
          {WALLET_NETWORK_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleNetworkChange(option.key)}
              className={cn(
                'rounded-sm border px-2 py-0.5 font-mono-label text-[0.58rem] transition-colors',
                network === option.key
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Withdraw to any external wallet — MetaMask, Phantom, an exchange, or another address you
        control. Funds are not locked on Eyes Open.
      </p>

      {!walletUnlocked ? (
        <p className="mt-4 rounded-sm border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          Unlock your Eyes wallet above to send {activeAsset.symbol} on {activeAsset.networkLabel}.
        </p>
      ) : (
        <form onSubmit={handleSend} className="mt-4 space-y-3">
          {assetOptions.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {assetOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setAssetKey(option.key)
                    setAmount('')
                    setError(null)
                  }}
                  className={cn(
                    'rounded-sm border px-2 py-0.5 font-mono-label text-[0.58rem] transition-colors',
                    assetKey === option.key
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.symbol}
                </button>
              ))}
            </div>
          ) : null}

          <div>
            <label className="font-mono-label text-[0.65rem] text-muted-foreground">
              Destination {network === 'solana' ? 'Solana address' : '0x address'}
            </label>
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder={network === 'solana' ? 'Recipient Solana address' : '0x…'}
              className="mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="font-mono-label text-[0.65rem] text-muted-foreground">
                Amount ({activeAsset.symbol} on {activeAsset.networkLabel})
              </label>
              <button
                type="button"
                onClick={handleMax}
                className="font-mono-label text-[0.58rem] text-primary hover:underline"
              >
                Max · {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </button>
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className="mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
            />
            {assetKey === 'native' ? (
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                A small {activeAsset.symbol} reserve is kept for future gas when you use Max.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {txHash ? (
            <div className="rounded-sm border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Sent —{' '}
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <code className="break-all">{txHash}</code>
              )}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !destinationValid || !amount.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send {activeAsset.symbol}
          </button>
        </form>
      )}
    </div>
  )
}

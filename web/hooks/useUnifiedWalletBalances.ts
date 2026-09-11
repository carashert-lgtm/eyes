'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppWallet } from '@/hooks/useAppWallet'
import type { UnifiedNativeBalance } from '@/lib/wallet-unified'

type ChainBalance = {
  balance: number
  nativeBalance: number
}

function formatNative(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

/** Load $EYES (Base) plus native balances on Base, Ethereum, and Solana in one pass. */
export function useUnifiedWalletBalances() {
  const { address, hasWallet, solanaAddress } = useAppWallet()
  const [eyesBalance, setEyesBalance] = useState(0)
  const [baseNative, setBaseNative] = useState(0)
  const [ethNative, setEthNative] = useState(0)
  const [solNative, setSolNative] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const refetch = useCallback(async () => {
    if (!address || !hasWallet) return

    setIsLoading(true)
    setIsError(false)
    try {
      const fetchChain = async (chain: 'base' | 'ethereum' | 'solana'): Promise<ChainBalance> => {
        const params = new URLSearchParams({ wallet: address, chain })
        if (chain === 'solana' && solanaAddress) {
          params.set('solanaAddress', solanaAddress)
        }
        const res = await fetch(`/api/wallet/balance?${params.toString()}`)
        const data = (await res.json()) as {
          balance?: number
          nativeBalance?: number
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Balance lookup failed')
        return {
          balance: typeof data.balance === 'number' ? data.balance : 0,
          nativeBalance: typeof data.nativeBalance === 'number' ? data.nativeBalance : 0,
        }
      }

      const [base, ethereum, solana] = await Promise.all([
        fetchChain('base'),
        fetchChain('ethereum'),
        solanaAddress ? fetchChain('solana') : Promise.resolve({ balance: 0, nativeBalance: 0 }),
      ])

      setEyesBalance(base.balance)
      setBaseNative(base.nativeBalance)
      setEthNative(ethereum.nativeBalance)
      setSolNative(solana.nativeBalance)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [address, hasWallet, solanaAddress])

  useEffect(() => {
    if (!address || !hasWallet) {
      setEyesBalance(0)
      setBaseNative(0)
      setEthNative(0)
      setSolNative(0)
      setIsLoading(false)
      setIsError(false)
      return
    }

    void refetch()
    const timer = window.setInterval(() => void refetch(), 30_000)
    return () => window.clearInterval(timer)
  }, [address, hasWallet, refetch])

  const nativeBalances: UnifiedNativeBalance[] = useMemo(
    () => [
      { chain: 'base', label: 'ETH on Base', symbol: 'ETH', balance: baseNative, formatted: formatNative(baseNative) },
      {
        chain: 'ethereum',
        label: 'ETH on Ethereum',
        symbol: 'ETH',
        balance: ethNative,
        formatted: formatNative(ethNative),
      },
      {
        chain: 'solana',
        label: 'SOL on Solana',
        symbol: 'SOL',
        balance: solNative,
        formatted: formatNative(solNative),
      },
    ],
    [baseNative, ethNative, solNative],
  )

  return {
    eyesBalance,
    eyesBalanceFormatted: eyesBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    nativeBalances,
    isLoading: hasWallet && isLoading,
    isError,
    hasWallet,
    refetch,
  }
}

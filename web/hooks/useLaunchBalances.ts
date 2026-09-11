'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppWallet } from '@/hooks/useAppWallet'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { deriveSolanaAddressFromEvmPrivateKey } from '@/lib/eyes-account/solana-address'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'
import { stakeTierForBalance } from '@/lib/retention-config'
import { hasEnoughEthForGas, MIN_ETH_GAS_FOR_LAUNCH } from '@/lib/wallet-errors'
import { MIN_SOL_GAS_FOR_LAUNCH } from '@/lib/create-launch-gates'

export function useLaunchBalances(launchChainKey: LaunchChainKey) {
  const { address, hasWallet } = useAppWallet()
  const { walletSession, account } = useEyesAccount()
  const token = getEyesTokenAddress()

  const [eyesBalance, setEyesBalance] = useState(0)
  const [nativeBalance, setNativeBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [balanceReady, setBalanceReady] = useState(false)
  const [isError, setIsError] = useState(false)

  const solanaAddress = useMemo(() => {
    if (account?.solanaAddress) return account.solanaAddress
    if (!walletSession?.privateKey) return null
    try {
      return deriveSolanaAddressFromEvmPrivateKey(walletSession.privateKey)
    } catch {
      return null
    }
  }, [account?.solanaAddress, walletSession?.privateKey])

  useEffect(() => {
    if (!token || !address || !hasWallet) {
      setEyesBalance(0)
      setNativeBalance(0)
      setIsLoading(false)
      setBalanceReady(false)
      setIsError(false)
      return
    }

    if (launchChainKey === 'solana' && !solanaAddress) {
      setBalanceReady(false)
      return
    }

    let cancelled = false
    setBalanceReady(false)

    async function load(background = false) {
      if (!background) setIsLoading(true)
      setIsError(false)
      try {
        const params = new URLSearchParams({
          wallet: address!,
          chain: launchChainKey,
        })
        if (launchChainKey === 'solana' && solanaAddress) {
          params.set('solanaAddress', solanaAddress)
        }
        const res = await fetch(`/api/wallet/balance?${params.toString()}`)
        const data = (await res.json()) as {
          balance?: number
          nativeBalance?: number
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Balance lookup failed')
        if (!cancelled) {
          setEyesBalance(typeof data.balance === 'number' ? data.balance : 0)
          setNativeBalance(typeof data.nativeBalance === 'number' ? data.nativeBalance : 0)
          setBalanceReady(true)
        }
      } catch {
        if (!cancelled) {
          setIsError(true)
          setBalanceReady(false)
        }
      } finally {
        if (!cancelled && !background) setIsLoading(false)
      }
    }

    void load(false)
    const timer = window.setInterval(() => {
      void load(true)
    }, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [token, address, hasWallet, launchChainKey, solanaAddress])

  const tier = stakeTierForBalance(eyesBalance)
  const lpGasOk =
    launchChainKey === 'solana'
      ? nativeBalance >= MIN_SOL_GAS_FOR_LAUNCH
      : hasEnoughEthForGas(nativeBalance)

  return {
    balance: eyesBalance,
    nativeBalance,
    balanceFormatted: eyesBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    nativeBalanceFormatted: nativeBalance.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }),
    hasGasForLaunch: lpGasOk,
    minEthGas: MIN_ETH_GAS_FOR_LAUNCH,
    minSolGas: MIN_SOL_GAS_FOR_LAUNCH,
    tier,
    hasWallet,
    isLoading: hasWallet && isLoading,
    balanceReady: hasWallet && balanceReady,
    isError,
    hasToken: Boolean(token),
    solanaAddress,
    solanaAddressReady: launchChainKey !== 'solana' || Boolean(solanaAddress),
  }
}
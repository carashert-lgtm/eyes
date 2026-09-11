'use client'

import { useMemo } from 'react'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { deriveSolanaAddressFromEvmPrivateKey } from '@/lib/eyes-account/solana-address'
import { depositAddressForNetwork } from '@/lib/wallet-unified'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'

/** Single embedded wallet session — no browser extension connectors. */
export function useAppWallet() {
  const {
    account,
    signedIn,
    walletSession,
    walletUnlocked,
    loading,
    busy,
    error,
    logout,
    lockWallet,
  } = useEyesAccount()

  const address = walletSession?.address ?? account?.walletAddress ?? null
  const solanaAddress = useMemo(() => {
    if (account?.solanaAddress) return account.solanaAddress
    if (!walletSession?.privateKey) return null
    try {
      return deriveSolanaAddressFromEvmPrivateKey(walletSession.privateKey)
    } catch {
      return null
    }
  }, [account?.solanaAddress, walletSession?.privateKey])

  /** Signed in with a known wallet address (read-only: balance, Discord link). */
  const hasWallet = signedIn && Boolean(address)
  /** Unlocked in memory — required for signing transactions. */
  const isConnected = hasWallet && walletUnlocked

  function payerAddressFor(chain: LaunchChainKey) {
    return depositAddressForNetwork(chain, address, solanaAddress)
  }

  return {
    address,
    solanaAddress,
    hasWallet,
    isConnected,
    signedIn,
    walletUnlocked,
    isConnecting: loading || busy,
    busy,
    error,
    embeddedSession: walletSession,
    accountEmail: account?.email ?? null,
    payerAddressFor,
    logout,
    lockWallet,
    disconnectAll: async () => {
      lockWallet()
      await logout()
    },
  }
}

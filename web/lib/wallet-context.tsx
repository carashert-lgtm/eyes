'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { FEATURES } from '@/lib/site-config'

type WalletContextValue = {
  connected: boolean
  address: string | null
  connect: () => void
  disconnect: () => void
  canConnect: boolean
}

const WalletContext = createContext<WalletContextValue | null>(null)

const MOCK_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    if (FEATURES.walletConnect) {
      // TODO: wire wagmi connect
      return
    }
    setConnected(true)
  }, [])

  const disconnect = useCallback(() => {
    setConnected(false)
  }, [])

  const value = useMemo<WalletContextValue>(
    () => ({
      connected,
      address: connected ? MOCK_ADDRESS : null,
      connect,
      disconnect,
      canConnect: !FEATURES.walletConnect,
    }),
    [connected, connect, disconnect],
  )

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return ctx
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}

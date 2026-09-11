'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getDefaultLaunchChain,
  getEnabledLaunchChains,
  getLaunchChain,
  isLaunchChainKey,
  type LaunchChainConfig,
  type LaunchChainKey,
} from '@/lib/launch-chains/registry'

const STORAGE_KEY = 'eyes-launch-chain'

type LaunchChainContextValue = {
  chain: LaunchChainConfig
  chains: LaunchChainConfig[]
  setChainKey: (key: LaunchChainKey) => void
}

const LaunchChainContext = createContext<LaunchChainContextValue | null>(null)

export function LaunchChainProvider({ children }: { children: ReactNode }) {
  const chains = useMemo(() => getEnabledLaunchChains(), [])
  const [chainKey, setChainKeyState] = useState<LaunchChainKey>(() => {
    if (typeof window === 'undefined') return getDefaultLaunchChain().key
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isLaunchChainKey(stored) && getLaunchChain(stored).enabled) {
      return stored
    }
    return getDefaultLaunchChain().key
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, chainKey)
  }, [chainKey])

  const setChainKey = useCallback((key: LaunchChainKey) => {
    if (!getLaunchChain(key).enabled) return
    setChainKeyState(key)
  }, [])

  const chain = useMemo(() => getLaunchChain(chainKey), [chainKey])

  const value = useMemo(
    () => ({ chain, chains, setChainKey }),
    [chain, chains, setChainKey],
  )

  return (
    <LaunchChainContext.Provider value={value}>{children}</LaunchChainContext.Provider>
  )
}

export function useLaunchChain() {
  const ctx = useContext(LaunchChainContext)
  if (!ctx) {
    const chain = getDefaultLaunchChain()
    return {
      chain,
      chains: getEnabledLaunchChains(),
      setChainKey: () => {},
    }
  }
  return ctx
}

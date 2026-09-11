'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { privateKeyToAccount } from 'viem/accounts'
import { createEncryptedWalletBlob, decryptPrivateKey } from '@/lib/eyes-account/wallet'
import { deriveSolanaAddressFromEvmPrivateKey } from '@/lib/eyes-account/solana-address'
import {
  clearWalletUnlock,
  markWalletLocked,
  persistWalletUnlock,
  restoreWalletUnlock,
} from '@/lib/eyes-account/session-unlock'
import { useWalletAutoLock } from '@/hooks/useWalletAutoLock'
import type { WalletAutoLockMinutes } from '@/lib/settings/types'
import type {
  EncryptedWalletBlob,
  EyesAccountPublic,
  WalletUnlockSession,
} from '@/lib/eyes-account/types'

type EyesAccountContextValue = {
  account: EyesAccountPublic | null
  signedIn: boolean
  walletSession: WalletUnlockSession | null
  walletUnlocked: boolean
  loading: boolean
  busy: boolean
  error: string | null
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  unlockWallet: (password: string) => Promise<void>
  logout: () => Promise<void>
  lockWallet: () => void
  exportPrivateKey: (password: string) => Promise<string>
  applyPasswordChange: (
    newPassword: string,
    enc: Pick<EncryptedWalletBlob, 'saltB64' | 'ivB64' | 'ciphertextB64'>,
  ) => Promise<void>
  refresh: () => Promise<void>
}

const EyesAccountContext = createContext<EyesAccountContextValue | null>(null)

async function unlockWalletFromBlob(
  password: string,
  blob: EncryptedWalletBlob,
): Promise<WalletUnlockSession> {
  const hex = await decryptPrivateKey(password, blob.saltB64, blob.ivB64, blob.ciphertextB64)
  const pk = (hex.startsWith('0x') ? hex : `0x${hex}`) as `0x${string}`
  const account = privateKeyToAccount(pk)
  if (account.address.toLowerCase() !== blob.address.toLowerCase()) {
    throw new Error('Incorrect password')
  }
  return { address: account.address, privateKey: pk }
}

function applySessionUnlock(
  account: EyesAccountPublic | null,
  session: WalletUnlockSession | null,
) {
  if (account?.id && session) {
    persistWalletUnlock(account.id, session)
  }
  return session
}

async function backfillSolanaAddressIfNeeded(
  account: EyesAccountPublic | null,
  password: string,
): Promise<EyesAccountPublic | null> {
  if (!account || account.solanaAddress) return account
  try {
    const res = await fetch('/api/eyes-account/solana-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return account
    const data = (await res.json()) as { account?: EyesAccountPublic }
    return data.account ?? account
  } catch {
    return account
  }
}

type MePayload = {
  signedIn?: boolean
  account?: EyesAccountPublic
  walletEnc?: EncryptedWalletBlob
}

export function EyesAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<EyesAccountPublic | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [walletSession, setWalletSession] = useState<WalletUnlockSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const walletEncRef = useRef<EncryptedWalletBlob | null>(null)
  const hydratedRef = useRef(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState<WalletAutoLockMinutes>(15)

  const cacheWalletEnc = useCallback((blob: EncryptedWalletBlob | null | undefined) => {
    if (blob) walletEncRef.current = blob
  }, [])

  const fetchMe = useCallback(async (): Promise<MePayload> => {
    const res = await fetch('/api/eyes-account/me', { cache: 'no-store' })
    return (await res.json()) as MePayload
  }, [])

  const refresh = useCallback(async () => {
    if (!hydratedRef.current) setLoading(true)
    try {
      const data = await fetchMe()
      if (!data.signedIn) {
        setSignedIn(false)
        setAccount(null)
        setWalletSession(null)
        walletEncRef.current = null
        clearWalletUnlock()
        return
      }

      const nextAccount = data.account ?? null
      cacheWalletEnc(data.walletEnc)
      setSignedIn(true)
      setAccount(nextAccount)

      setWalletSession((prev) => {
        if (prev?.privateKey) return prev
        if (!nextAccount?.id) return null
        return restoreWalletUnlock(nextAccount.id)
      })
    } catch {
      setSignedIn(false)
      setAccount(null)
      setWalletSession(null)
      walletEncRef.current = null
    } finally {
      hydratedRef.current = true
      setLoading(false)
    }
  }, [cacheWalletEnc, fetchMe])

  useEffect(() => {
    refresh()
  }, [refresh])

  const signup = useCallback(async (email: string, password: string) => {
    setBusy(true)
    setError(null)
    try {
      const { wallet, privateKey } = await createEncryptedWalletBlob(password)
      const solanaAddress = deriveSolanaAddressFromEvmPrivateKey(privateKey)
      const res = await fetch('/api/eyes-account/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, wallet, solanaAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Signup failed')
      cacheWalletEnc(data.walletEnc as EncryptedWalletBlob)
      const session = await unlockWalletFromBlob(password, data.walletEnc as EncryptedWalletBlob)
      const nextAccount = await backfillSolanaAddressIfNeeded(data.account, password)
      setAccount(nextAccount)
      setSignedIn(true)
      setWalletSession(applySessionUnlock(nextAccount, session))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Signup failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [cacheWalletEnc])

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/eyes-account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Login failed')
      cacheWalletEnc(data.walletEnc as EncryptedWalletBlob)
      const session = await unlockWalletFromBlob(password, data.walletEnc as EncryptedWalletBlob)
      const nextAccount = await backfillSolanaAddressIfNeeded(data.account, password)
      setAccount(nextAccount)
      setSignedIn(true)
      setWalletSession(applySessionUnlock(nextAccount, session))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [cacheWalletEnc])

  const unlockWallet = useCallback(async (password: string) => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMe()
      if (!data.signedIn) throw new Error('Sign in first')

      const blob = data.walletEnc ?? walletEncRef.current ?? null
      if (!blob) throw new Error('Could not load wallet — sign in again')
      cacheWalletEnc(blob)

      const nextAccount = data.account ?? account
      if (nextAccount) setAccount(nextAccount)
      setSignedIn(true)

      const session = await unlockWalletFromBlob(password, blob)
      const nextWithSolana = await backfillSolanaAddressIfNeeded(nextAccount ?? null, password)
      if (nextWithSolana) setAccount(nextWithSolana)
      setWalletSession(applySessionUnlock(nextWithSolana ?? nextAccount ?? null, session))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unlock failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [account, cacheWalletEnc, fetchMe])

  const logout = useCallback(async () => {
    setBusy(true)
    try {
      await fetch('/api/eyes-account/logout', { method: 'POST' })
    } finally {
      clearWalletUnlock()
      walletEncRef.current = null
      setWalletSession(null)
      setAccount(null)
      setSignedIn(false)
      setError(null)
      setBusy(false)
    }
  }, [])

  const lockWallet = useCallback(() => {
    markWalletLocked()
    setWalletSession(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!signedIn) return
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { settings?: { walletAutoLockMinutes?: WalletAutoLockMinutes } }) => {
        if (typeof data.settings?.walletAutoLockMinutes === 'number') {
          setAutoLockMinutes(data.settings.walletAutoLockMinutes)
        }
      })
      .catch(() => {})
  }, [signedIn])

  useWalletAutoLock(Boolean(walletSession?.privateKey), autoLockMinutes, lockWallet)

  const applyPasswordChange = useCallback(
    async (
      newPassword: string,
      enc: Pick<EncryptedWalletBlob, 'saltB64' | 'ivB64' | 'ciphertextB64'>,
    ) => {
      if (!account?.walletAddress) throw new Error('No wallet on account')
      const blob: EncryptedWalletBlob = {
        v: 1,
        address: account.walletAddress as `0x${string}`,
        saltB64: enc.saltB64,
        ivB64: enc.ivB64,
        ciphertextB64: enc.ciphertextB64,
        createdAt: new Date().toISOString(),
      }
      cacheWalletEnc(blob)
      const session = await unlockWalletFromBlob(newPassword, blob)
      setWalletSession(applySessionUnlock(account, session))
    },
    [account, cacheWalletEnc],
  )

  const exportPrivateKey = useCallback(
    async (password: string) => {
      if (!account?.walletAddress) throw new Error('No wallet')
      const data = await fetchMe()
      const blob = data.walletEnc ?? walletEncRef.current ?? null
      if (!blob) throw new Error('Wallet not found')
      cacheWalletEnc(blob)
      const hex = await decryptPrivateKey(
        password,
        blob.saltB64,
        blob.ivB64,
        blob.ciphertextB64,
      )
      return hex.startsWith('0x') ? hex : `0x${hex}`
    },
    [account?.walletAddress, cacheWalletEnc, fetchMe],
  )

  const value = useMemo(
    () => ({
      account,
      signedIn,
      walletSession,
      walletUnlocked: Boolean(walletSession?.privateKey),
      loading,
      busy,
      error,
      signup,
      login,
      unlockWallet,
      logout,
      lockWallet,
      exportPrivateKey,
      applyPasswordChange,
      refresh,
    }),
    [
      account,
      signedIn,
      walletSession,
      loading,
      busy,
      error,
      signup,
      login,
      unlockWallet,
      logout,
      lockWallet,
      exportPrivateKey,
      applyPasswordChange,
      refresh,
    ],
  )

  return <EyesAccountContext.Provider value={value}>{children}</EyesAccountContext.Provider>
}

export function useEyesAccount() {
  const ctx = useContext(EyesAccountContext)
  if (!ctx) throw new Error('useEyesAccount must be used within EyesAccountProvider')
  return ctx
}

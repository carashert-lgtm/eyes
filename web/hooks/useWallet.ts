'use client'

import { useMemo } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from 'wagmi'
import { formatEther } from 'viem'
import { PRESALE_CHAIN } from '@/lib/wagmi'

/**
 * Thin façade over wagmi account/connect state so the UI never touches
 * connectors directly. Exposes exactly what the presale panel needs.
 */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, status: connectStatus, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const { data: balance } = useBalance({ address })

  const injectedConnector = useMemo(
    () => connectors.find((c) => c.type === 'injected') ?? connectors[0],
    [connectors],
  )
  const coinbaseConnector = useMemo(
    () => connectors.find((c) => c.id === 'coinbaseWalletSDK' || c.type === 'coinbaseWallet'),
    [connectors],
  )

  const wrongNetwork = isConnected && chainId !== PRESALE_CHAIN.id

  return {
    address,
    isConnected,
    isConnecting: isConnecting || connectStatus === 'pending',
    connectError,
    balanceFormatted: balance ? formatEther(balance.value) : null,
    balanceSymbol: balance?.symbol ?? 'ETH',
    wrongNetwork,
    connectInjected: () =>
      injectedConnector && connect({ connector: injectedConnector }),
    connectCoinbase: () =>
      coinbaseConnector && connect({ connector: coinbaseConnector }),
    switchToPresaleChain: () => switchChain({ chainId: PRESALE_CHAIN.id }),
    disconnect,
    hasInjected: Boolean(injectedConnector),
    hasCoinbase: Boolean(coinbaseConnector),
  }
}

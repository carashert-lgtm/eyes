'use client'

import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS } from '@/lib/site-config'
import { stakeTierForBalance } from '@/lib/retention-config'
import { PRESALE_CHAIN } from '@/lib/wagmi'

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function useEyesBalance() {
  const { address, isConnected } = useAccount()
  const token = CONTRACTS.eyesToken

  const { data: decimals } = useReadContract({
    address: token as `0x${string}`,
    abi: ERC20_BALANCE_ABI,
    functionName: 'decimals',
    chainId: PRESALE_CHAIN.id,
    query: { enabled: Boolean(token && isConnected) },
  })

  const { data: raw, isLoading, isError } = useReadContract({
    address: token as `0x${string}`,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: PRESALE_CHAIN.id,
    query: { enabled: Boolean(token && address && isConnected) },
  })

  const dec = decimals !== undefined ? Number(decimals) : 18
  const balance = raw !== undefined ? Number(formatUnits(raw, dec)) : 0
  const tier = stakeTierForBalance(balance)

  return {
    balance,
    balanceFormatted: balance.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    tier,
    isConnected,
    isLoading: isConnected && isLoading,
    isError,
    hasToken: Boolean(token),
  }
}

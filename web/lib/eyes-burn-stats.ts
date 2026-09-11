import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { EYES_BURN_ADDRESS } from '@/lib/contracts/eyes-token'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import { getPublicRpcUrls, ACTIVE_WALLET_CHAIN } from '@/lib/viem-chain'

const EYES_TOTAL_SUPPLY = 1_000_000_000

const ERC20_READ_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
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

export type EyesBurnStats = {
  totalSupply: number
  deadBalance: number
  burnedViaSupplyReduction: number
  sentToDeadAddress: number
  totalRemoved: number
  updatedAt: string
}

export async function fetchEyesBurnStats(): Promise<EyesBurnStats | null> {
  const token = getEyesTokenAddress() as Address | null
  if (!token) return null

  let lastError: unknown
  for (const rpc of getPublicRpcUrls()) {
    try {
      const client = createPublicClient({
        chain: ACTIVE_WALLET_CHAIN,
        transport: http(rpc),
      })
      const [totalSupplyRaw, deadBalanceRaw, decimals] = await Promise.all([
        client.readContract({
          address: token,
          abi: ERC20_READ_ABI,
          functionName: 'totalSupply',
        }),
        client.readContract({
          address: token,
          abi: ERC20_READ_ABI,
          functionName: 'balanceOf',
          args: [EYES_BURN_ADDRESS],
        }),
        client.readContract({
          address: token,
          abi: ERC20_READ_ABI,
          functionName: 'decimals',
        }),
      ])

      const totalSupply = Number(formatUnits(totalSupplyRaw, Number(decimals)))
      const deadBalance = Number(formatUnits(deadBalanceRaw, Number(decimals)))
      const burnedViaSupplyReduction = Math.max(0, EYES_TOTAL_SUPPLY - totalSupply)
      const totalRemoved = burnedViaSupplyReduction + deadBalance

      return {
        totalSupply,
        deadBalance,
        burnedViaSupplyReduction,
        sentToDeadAddress: deadBalance,
        totalRemoved,
        updatedAt: new Date().toISOString(),
      }
    } catch (e) {
      lastError = e
    }
  }

  console.warn('[eyes-burn-stats] lookup failed', lastError)
  return null
}

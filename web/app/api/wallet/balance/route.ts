import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import { isLaunchChainKey, resolveLaunchChain } from '@/lib/launch-chains/registry'
import { isValidSolanaAddress } from '@/lib/eyes-account/solana-address'
import { normalizeEthAddress } from '@/lib/security/validation'
import { getPublicRpcUrls, ACTIVE_WALLET_CHAIN } from '@/lib/viem-chain'
import { readNativeBalance } from '@/lib/wallet-native-balance'

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

async function readEyesBalance(address: Address, tokenAddress: Address) {
  let lastError: unknown
  for (const rpc of getPublicRpcUrls()) {
    try {
      const client = createPublicClient({
        chain: ACTIVE_WALLET_CHAIN,
        transport: http(rpc),
      })
      const [raw, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: tokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'decimals',
        }),
      ])
      return Number(formatUnits(raw, Number(decimals)))
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Balance lookup failed')
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet')
  const address = wallet ? normalizeEthAddress(wallet) : null
  if (!address) {
    return NextResponse.json({ error: 'Valid wallet query required' }, { status: 400 })
  }

  const chainRaw = request.nextUrl.searchParams.get('chain') ?? 'base'
  const chainKey = isLaunchChainKey(chainRaw) ? chainRaw : 'base'
  const chain = resolveLaunchChain(chainKey)

  const token = getEyesTokenAddress()
  if (!token) {
    return NextResponse.json({ error: 'EYES token not configured' }, { status: 503 })
  }

  let nativeLookupAddress: string = address
  if (chainKey === 'solana') {
    const solanaAddress = request.nextUrl.searchParams.get('solanaAddress')?.trim() ?? ''
    if (!isValidSolanaAddress(solanaAddress)) {
      return NextResponse.json({ error: 'Valid solanaAddress query required for SOL balance' }, { status: 400 })
    }
    nativeLookupAddress = solanaAddress
  }

  try {
    const [balance, nativeBalance] = await Promise.all([
      readEyesBalance(address, token as Address),
      readNativeBalance(chainKey, nativeLookupAddress),
    ])
    return NextResponse.json({
      ok: true,
      wallet: address,
      chain: chainKey,
      token,
      balance,
      balanceFormatted: balance.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      nativeBalance,
      nativeSymbol: chain.nativeSymbol,
      nativeBalanceFormatted: nativeBalance.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }),
      /** @deprecated use nativeBalance */
      ethBalance: chainKey === 'base' ? nativeBalance : undefined,
      ethBalanceFormatted:
        chainKey === 'base'
          ? nativeBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
          : undefined,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Balance lookup failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

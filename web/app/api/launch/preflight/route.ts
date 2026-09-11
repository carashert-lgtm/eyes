import { NextRequest, NextResponse } from 'next/server'

import { isAddress } from 'viem'

import { CONTRACTS } from '@/lib/site-config'

import { preflightLaunchFactory } from '@/lib/launch-factory-preflight'

import { isLaunchChainKey, resolveLaunchChain } from '@/lib/launch-chains/registry'

import { preflightSolanaLaunch } from '@/lib/solana-launch-preflight'

import { normalizeEthAddress } from '@/lib/security/validation'



export async function GET(request: NextRequest) {

  const chainKeyRaw = request.nextUrl.searchParams.get('chain') ?? 'base'

  const chainKey = isLaunchChainKey(chainKeyRaw) ? chainKeyRaw : 'base'

  const chain = resolveLaunchChain(chainKey)



  if (chain.key === 'solana') {

    const result = preflightSolanaLaunch(chain)

    return NextResponse.json(result, { status: result.ok ? 200 : 503 })

  }



  const wallet = normalizeEthAddress(request.nextUrl.searchParams.get('wallet') ?? '')

  const factory =

    chain.key === 'ethereum'

      ? chain.factoryAddress

      : CONTRACTS.launchFactory



  if (!wallet) {

    return NextResponse.json({ error: 'wallet query param required' }, { status: 400 })

  }

  if (!factory || !isAddress(factory)) {

    return NextResponse.json(

      {

        ok: false,

        chainKey: chain.key,

        error: `Launch factory is not configured on ${chain.label}`,

        issues: [`${chain.label} factory not wired`],

      },

      { status: 503 },

    )

  }



  try {

    const result = await preflightLaunchFactory(
      factory,
      wallet,
      chain.key === 'ethereum' ? 'ethereum' : 'base',
    )

    return NextResponse.json({ ...result, chainKey: chain.key })

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Factory preflight failed'

    return NextResponse.json({ ok: false, chainKey: chain.key, error: message }, { status: 500 })

  }

}


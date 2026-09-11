import { NextRequest, NextResponse } from 'next/server'

import { isAddress, type Address } from 'viem'

import { getEyesAccountIdentity } from '@/lib/account-identity'

import { getFomoTokenUrl } from '@/lib/fomo-links'

import {

  isLaunchChainKey,

  isValidLaunchWallet,

  resolveLaunchChain,

  type LaunchChainKey,

} from '@/lib/launch-chains/registry'

import { registerLaunchMetadata } from '@/lib/launch-metadata-store'
import { dispatchLaunchWebhook } from '@/lib/settings/webhook-dispatch'

import { setCachedLaunchesSnapshot } from '@/lib/launch-snapshot-cache'

import { syncLaunchesFromChain } from '@/lib/launch-indexer'

import {

  checkRateLimit,

  getClientIp,

  rateLimitResponse,

} from '@/lib/security/rate-limit'



const LIMIT = 10

const WINDOW_MS = 15 * 60 * 1000



function validEvmAddr(v: unknown): v is Address {

  return typeof v === 'string' && isAddress(v)

}



export async function POST(request: NextRequest) {

  const identity = await getEyesAccountIdentity()

  if (!identity) {

    return NextResponse.json({ error: 'Sign in with your Eyes account first' }, { status: 401 })

  }



  const ip = getClientIp(request)

  const limited = checkRateLimit('launch-register', ip, LIMIT, WINDOW_MS)

  if (!limited.ok) {

    const { status, body, headers } = rateLimitResponse(limited.retryAfterSec)

    return NextResponse.json(body, { status, headers })

  }



  let body: Record<string, unknown>

  try {

    body = await request.json()

  } catch {

    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  }



  const chainKeyRaw = typeof body.chainKey === 'string' ? body.chainKey : 'base'

  if (!isLaunchChainKey(chainKeyRaw)) {

    return NextResponse.json({ error: 'Invalid chainKey' }, { status: 400 })

  }

  const chainKey = chainKeyRaw as LaunchChainKey

  const chain = resolveLaunchChain(chainKey)



  const launchId = Number(body.launchId)

  const tokenAddress = typeof body.tokenAddress === 'string' ? body.tokenAddress.trim() : ''

  const name = typeof body.name === 'string' ? body.name.trim() : ''

  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : ''

  const creator = typeof body.creator === 'string' ? body.creator.trim() : ''



  if (!Number.isFinite(launchId) || launchId < 1) {

    return NextResponse.json({ error: 'Invalid launchId' }, { status: 400 })

  }

  if (!tokenAddress || !isValidLaunchWallet(chain, tokenAddress)) {

    return NextResponse.json({ error: 'Invalid token address for selected network' }, { status: 400 })

  }

  if (!creator || !isValidLaunchWallet(chain, creator)) {

    return NextResponse.json({ error: 'Invalid creator address for selected network' }, { status: 400 })

  }

  if (chainKey === 'base' || chainKey === 'ethereum') {
    if (!identity.walletAddress || creator.toLowerCase() !== identity.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Creator must match your Eyes wallet address' },
        { status: 403 },
      )
    }
  }

  if (chainKey === 'solana') {
    if (!identity.solanaAddress || creator !== identity.solanaAddress) {
      return NextResponse.json(
        { error: 'Creator must match your paired Eyes Solana address' },
        { status: 403 },
      )
    }
  }

  if (!name || !symbol) {

    return NextResponse.json({ error: 'Name and symbol required' }, { status: 400 })

  }



  const pairAddress =

    typeof body.pairAddress === 'string' && body.pairAddress.trim()

      ? body.pairAddress.trim()

      : null

  if (pairAddress && chain.family === 'evm' && !validEvmAddr(pairAddress)) {

    return NextResponse.json({ error: 'Invalid pair address' }, { status: 400 })

  }



  try {

    const record = await registerLaunchMetadata({

      launchId,

      chainKey,

      tokenAddress,

      pairAddress,

      name,

      symbol,

      description: typeof body.description === 'string' ? body.description.slice(0, 280) : undefined,

      website: typeof body.website === 'string' ? body.website.slice(0, 200) : undefined,

      twitter: typeof body.twitter === 'string' ? body.twitter.slice(0, 80) : undefined,

      telegram: typeof body.telegram === 'string' ? body.telegram.slice(0, 200) : undefined,

      creator,

      deployTxHash: typeof body.deployTxHash === 'string' ? body.deployTxHash : undefined,

      seedTxHash: typeof body.seedTxHash === 'string' ? body.seedTxHash : undefined,

      fomoUrl: getFomoTokenUrl(tokenAddress, chainKey),

    })



    try {

      const snapshot = await syncLaunchesFromChain()

      setCachedLaunchesSnapshot(snapshot)

    } catch {

      // Cache refresh is best-effort

    }

    void dispatchLaunchWebhook(identity.email, 'launch.discovery_registered', {
      chainKey,
      launchId,
      tokenAddress,
      name,
      symbol,
      creator,
      deployTxHash: typeof body.deployTxHash === 'string' ? body.deployTxHash : null,
    })

    return NextResponse.json({ ok: true, record })

  } catch (e) {

    return NextResponse.json(

      { error: e instanceof Error ? e.message : 'Registration failed' },

      { status: 400 },

    )

  }

}


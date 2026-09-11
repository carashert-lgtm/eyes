import { NextRequest, NextResponse } from 'next/server'
import { getEyesAccountFromCookies } from '@/lib/eyes-account/session'
import { isAllowedWalletRpcMethod, relayWalletRpc } from '@/lib/wallet-rpc-relay'
import type { LaunchEvmChainKey } from '@/lib/viem-chain'

function parseChainKey(raw: unknown): LaunchEvmChainKey {
  return raw === 'ethereum' ? 'ethereum' : 'base'
}

export async function POST(request: NextRequest) {
  const session = await getEyesAccountFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to use wallet RPC' }, { status: 401 })
  }

  let body: { method?: string; params?: unknown[]; chain?: string }
  try {
    body = (await request.json()) as { method?: string; params?: unknown[]; chain?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const method = body.method?.trim()
  if (!method) {
    return NextResponse.json({ error: 'RPC method required' }, { status: 400 })
  }
  if (!isAllowedWalletRpcMethod(method)) {
    return NextResponse.json({ error: `RPC method not allowed: ${method}` }, { status: 403 })
  }

  const params = Array.isArray(body.params) ? body.params : []
  const chainKey = parseChainKey(body.chain)
  const relay = await relayWalletRpc(method, params, chainKey)

  if (!relay.ok) {
    return NextResponse.json(
      {
        error: relay.error,
        rpcError: relay.error,
        code: relay.code,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, result: relay.result })
}

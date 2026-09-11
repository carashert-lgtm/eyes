import { NextRequest, NextResponse } from 'next/server'
import { getEyesAccountFromCookies } from '@/lib/eyes-account/session'
import { isAllowedSolanaRpcMethod, relaySolanaRpc } from '@/lib/solana-rpc-relay'

export async function POST(request: NextRequest) {
  const session = await getEyesAccountFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to use Solana RPC' }, { status: 401 })
  }

  let body: { method?: string; params?: unknown[] }
  try {
    body = (await request.json()) as { method?: string; params?: unknown[] }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const method = body.method?.trim()
  if (!method) {
    return NextResponse.json({ error: 'RPC method required' }, { status: 400 })
  }
  if (!isAllowedSolanaRpcMethod(method)) {
    return NextResponse.json({ error: `RPC method not allowed: ${method}` }, { status: 403 })
  }

  const params = Array.isArray(body.params) ? body.params : []
  const relay = await relaySolanaRpc(method, params)

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

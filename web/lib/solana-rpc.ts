import { Connection, type ConnectionConfig } from '@solana/web3.js'
import { defaultSolanaRpcForCluster, getSolanaCluster } from '@/lib/solana-cluster'
import { relaySolanaRpc } from '@/lib/solana-rpc-relay'

const PROXY_PLACEHOLDER = 'https://solana-rpc-proxy.local'

type JsonRpcBody = {
  id?: number | string
  method?: string
  params?: unknown[]
}

function parseJsonRpcBody(init?: RequestInit): JsonRpcBody | null {
  if (!init?.body || typeof init.body !== 'string') return null
  try {
    return JSON.parse(init.body) as JsonRpcBody
  } catch {
    return null
  }
}

function jsonRpcResponse(id: number | string | undefined, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function jsonRpcErrorResponse(id: number | string | undefined, message: string, code = -32000): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: id ?? 1,
      error: { code, message },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

/** Server-side fetch that retries across all configured Solana RPC endpoints. */
function createServerSolanaFetch(): ConnectionConfig['fetch'] {
  return async (_input, init) => {
    const body = parseJsonRpcBody(init)
    const method = body?.method?.trim()
    if (!body || !method) {
      return jsonRpcErrorResponse(body?.id, 'Invalid Solana RPC request')
    }

    const params = Array.isArray(body.params) ? body.params : []
    const relay = await relaySolanaRpc(method, params)
    if (!relay.ok) {
      return jsonRpcErrorResponse(body.id, relay.error, relay.code ?? -32000)
    }
    return jsonRpcResponse(body.id, relay.result)
  }
}

/** Browser fetch that routes Solana JSON-RPC through our authenticated API proxy. */
function createClientSolanaFetch(): ConnectionConfig['fetch'] {
  return async (_input, init) => {
    const body = parseJsonRpcBody(init)
    const method = body?.method?.trim()
    if (!body || !method) {
      return jsonRpcErrorResponse(body?.id, 'Invalid Solana RPC request')
    }

    const params = Array.isArray(body.params) ? body.params : []
    try {
      const res = await fetch('/api/solana/rpc', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      })
      const data = (await res.json()) as { result?: unknown; error?: string; code?: number }
      if (!res.ok) {
        return jsonRpcErrorResponse(body.id, data.error ?? 'Solana RPC proxy failed', data.code ?? -32000)
      }
      return jsonRpcResponse(body.id, data.result)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Solana RPC proxy failed'
      return jsonRpcErrorResponse(body.id, message)
    }
  }
}

/** Legacy single-URL helper — prefer createSolanaConnection(). */
export function getSolanaRpcUrl(): string {
  return defaultSolanaRpcForCluster(getSolanaCluster())
}

export { getSolanaCluster }

export function createSolanaConnection(commitment: 'confirmed' | 'finalized' = 'confirmed'): Connection {
  const fetchImpl =
    typeof window !== 'undefined' ? createClientSolanaFetch() : createServerSolanaFetch()

  return new Connection(PROXY_PLACEHOLDER, {
    commitment,
    fetch: fetchImpl,
    disableRetryOnRateLimit: true,
  })
}

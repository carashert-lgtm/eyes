import type { Hash } from 'viem'
import { blockExplorerTxUrl } from '@/lib/chain-config'

const POLL_MS = 3_000
const MAX_WAIT_MS = 240_000

type ReceiptPoll = {
  status: 'success' | 'reverted' | 'pending'
}

async function pollReceipt(hash: Hash): Promise<ReceiptPoll> {
  const res = await fetch('/api/wallet/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    }),
  })

  let data: { result?: { status?: string } | null; error?: string }
  try {
    data = (await res.json()) as { result?: { status?: string } | null; error?: string }
  } catch {
    return { status: 'pending' }
  }

  if (!res.ok || !data.result) return { status: 'pending' }
  if (data.result.status === '0x1') return { status: 'success' }
  if (data.result.status === '0x0') return { status: 'reverted' }
  return { status: 'pending' }
}

/** Poll wallet RPC until a broadcast tx confirms (server-side RPC fallback per poll). */
export async function waitForWalletReceipt(
  hash: Hash,
  options?: { label?: string; required?: boolean },
): Promise<boolean> {
  const label = options?.label ?? 'Transaction'
  const required = options?.required ?? true
  const started = Date.now()

  while (Date.now() - started < MAX_WAIT_MS) {
    const poll = await pollReceipt(hash)
    if (poll.status === 'success') return true
    if (poll.status === 'reverted') {
      throw new Error(`${label} reverted on-chain`)
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    const poll = await pollReceipt(hash)
    if (poll.status === 'success') return true
    if (poll.status === 'reverted') {
      throw new Error(`${label} reverted on-chain`)
    }
  }

  if (!required) return false

  const explorer = blockExplorerTxUrl(hash)
  const suffix = explorer ? ` View on BaseScan: ${explorer}` : ''
  throw new Error(
    `${label} is taking longer than expected to confirm.${suffix} If $EYES already moved, wait one minute and retry Create Launch.`,
  )
}

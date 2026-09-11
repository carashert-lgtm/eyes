/** Walk viem / fetch error chains for the deepest useful message. */
function errorMessages(error: unknown): string[] {
  const out: string[] = []
  let cur: unknown = error
  let depth = 0
  while (cur && depth < 8) {
    if (typeof cur === 'object' && cur !== null) {
      const obj = cur as Record<string, unknown>
      if (typeof obj.shortMessage === 'string') out.push(obj.shortMessage)
      if (typeof obj.message === 'string') out.push(obj.message)
      if (typeof obj.details === 'string') out.push(obj.details)
      cur = obj.cause
    } else if (typeof cur === 'string') {
      out.push(cur)
      break
    } else {
      break
    }
    depth++
  }
  return [...new Set(out.filter(Boolean))]
}

/** Strip provider URLs and API keys from RPC errors shown to users. */
export function sanitizeRpcError(message: string): string {
  return message
    .replace(/https:\/\/[^\s]*alchemy\.com[^\s]*/gi, 'RPC provider')
    .replace(/https:\/\/[^\s]*infura\.io[^\s]*/gi, 'RPC provider')
    .replace(/alch_[a-zA-Z0-9_-]+/g, 'alch_***')
    .replace(/Request body:\s*\{[^}]+\}/gi, '')
    .replace(/URL:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Map viem / RPC errors to user-facing wallet messages. */
export function formatWalletTxError(error: unknown): string {
  const parts = errorMessages(error).map(sanitizeRpcError)
  const msg = parts.join(' · ') || String(error)
  const lower = msg.toLowerCase()

  if (
    lower.includes('gas required exceeds allowance') ||
    lower.includes('insufficient funds for gas') ||
    lower.includes('insufficient balance for transfer') ||
    (lower.includes('insufficient funds') && !lower.includes('eyes'))
  ) {
    return 'Not enough ETH on Base for gas. Send a small amount of ETH to your Eyes wallet address (same address as $EYES), then try again.'
  }

  if (
    lower.includes('transfer amount exceeds balance') ||
    lower.includes('erc20: transfer amount exceeds balance') ||
    lower.includes('exceeds balance')
  ) {
    return 'Not enough $EYES in your Eyes wallet for this fee. Send $EYES to your wallet address on Base, then try again.'
  }

  if (lower.includes('wallet unlock') || lower.includes('wallet session')) {
    return parts.find((p) => /unlock|log out|session/i.test(p)) ?? msg
  }

  if (lower.includes('insufficient') && lower.includes('eyes')) {
    return msg
  }

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'Transaction cancelled.'
  }

  if (lower.includes('execution reverted')) {
    const detail = parts.find((p) => /revert|exceed|denied|paused|blacklist/i.test(p))
    return detail ?? 'Transaction would fail on Base. Check your $EYES and ETH balances, then try again.'
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Network error talking to Base. Check your connection and try again.'
  }

  if (lower.includes('timed out while waiting for transaction') || lower.includes('taking longer than expected')) {
    return 'Transaction broadcast but confirmation is slow on Base. Check BaseScan — if $EYES moved, wait one minute and retry Create Launch.'
  }

  if (lower.includes('base_mainnet is not enabled') || lower.includes('not enabled for this app')) {
    return 'Base RPC provider misconfigured. Your transaction may still have submitted — check BaseScan for your wallet.'
  }

  if (lower.includes('unknown rpc error')) {
    const detail = parts.find((p) => !/unknown rpc error/i.test(p))
    if (detail) return formatWalletTxError(new Error(detail))
  }

  if (
    lower.includes('block height exceeded') ||
    lower.includes('has expired') ||
    lower.includes('blockhash not found')
  ) {
    return 'Solana confirmation was slow — your transaction may still have succeeded. Refresh the page and check Solscan before retrying deploy.'
  }

  if (lower.includes('simulation failed') || lower.includes('instructionfallbacknotfound')) {
    const logLine = parts.find((p) => /Program log:/i.test(p) || /AnchorError/i.test(p))
    if (/InstructionFallbackNotFound/i.test(msg)) {
      return 'Solana launch program client mismatch — refresh the page and retry. If this persists, contact support.'
    }
    if (/insufficient lamports/i.test(msg)) {
      return 'Not enough SOL in your Eyes Solana wallet. Send more SOL for mint rent + gas, then retry.'
    }
    if (/computational budget exceeded|exceeded max compute/i.test(msg)) {
      return 'Solana transaction needed more compute than allowed. Retry — if it persists, contact support.'
    }
    if (logLine) return sanitizeRpcError(logLine.replace(/^Program log:\s*/i, ''))
  }

  return msg.length > 320 ? `${msg.slice(0, 317)}…` : msg
}

/** Rough minimum ETH for launch fee burns + deploy + seed (gas only, excludes LP ETH). */
export const MIN_ETH_GAS_FOR_LAUNCH = 0.003

export function hasEnoughEthForGas(ethBalance: number, min = MIN_ETH_GAS_FOR_LAUNCH): boolean {
  return Number.isFinite(ethBalance) && ethBalance >= min
}

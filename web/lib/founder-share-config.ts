/** Canonical $EYES owner allocation (public model). */
export const EYES_TOTAL_SUPPLY = 1_000_000_000

export const FOUNDER_SHARE = {
  /** 10% of 1B total supply — single owner allocation */
  totalPercent: 10,
  totalTokens: 100_000_000,
  owner: {
    label: 'Owner',
    percent: 10,
    tokens: 100_000_000,
  },
} as const

export function formatTokensShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`
  }
  return n.toLocaleString()
}

export function formatTokensFull(n: number): string {
  return n.toLocaleString()
}

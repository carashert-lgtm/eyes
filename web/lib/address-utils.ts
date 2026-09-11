/** Shorten a wallet address for display. */
export function truncateAddress(address?: string | null) {
  if (!address) return '—'
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

import { isAddress, type Address } from 'viem'

// Contribution bounds (ETH). Adjust to match the live presale parameters.
export const MIN_ETH = 0.01
export const MAX_ETH = 5

// Treasury recipient is read from a public env var so it can be rotated
// without a code change. Sending is disabled in the UI until it is a valid
// address, so a missing value can never route funds to the zero address.
const RAW_RECIPIENT = process.env.NEXT_PUBLIC_PRESALE_RECIPIENT ?? ''

export const PRESALE_RECIPIENT: Address | null = isAddress(RAW_RECIPIENT)
  ? (RAW_RECIPIENT as Address)
  : null

export function truncateAddress(address?: string | null) {
  if (!address) return '—'
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

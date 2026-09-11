import { isAddress, getAddress, type Address } from 'viem'
import { ACTIVE_CHAIN_ID, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'

/** On-chain Eyes fee collector from base-mainnet deployment. */
export const BASE_MAINNET_FEE_COLLECTOR =
  '0xcC61A3C647d416A124143Be1c367232BAA8fa51f' as const

/** Previous mainnet collector — still accept treasury legs from earlier launches. */
export const LEGACY_BASE_MAINNET_FEE_COLLECTOR =
  '0xA59Eec5e2aA95E6BB1E1Ac9Eb99C7e05d32B1CdE' as const

const IS_BASE_MAINNET = !IS_LOCAL_ANVIL && ACTIVE_CHAIN_ID === 8453

function pushUnique(out: Address[], addr: Address) {
  if (!out.some((a) => a.toLowerCase() === addr.toLowerCase())) out.push(addr)
}

/** Launch fee / boost treasury — must match on client (send) and server (verify). */
export function getSettlementTreasuryAddress(): Address | null {
  if (IS_BASE_MAINNET) {
    const fromPublic = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS?.trim()
    if (
      fromPublic &&
      isAddress(fromPublic) &&
      fromPublic.toLowerCase() !== BASE_MAINNET_FEE_COLLECTOR.toLowerCase()
    ) {
      console.warn(
        `[config] Ignoring fee collector env ${fromPublic} on Base mainnet; using ${BASE_MAINNET_FEE_COLLECTOR}`,
      )
    }
    return getAddress(BASE_MAINNET_FEE_COLLECTOR)
  }

  const fromPublic = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS?.trim()
  if (fromPublic && isAddress(fromPublic)) {
    return getAddress(fromPublic)
  }

  return null
}

/** Addresses accepted for treasury leg (current + legacy collectors). */
export function getAcceptedTreasuryAddresses(): Address[] {
  const out: Address[] = []
  const primary = getSettlementTreasuryAddress()
  if (primary) pushUnique(out, primary)

  if (IS_BASE_MAINNET) {
    pushUnique(out, getAddress(BASE_MAINNET_FEE_COLLECTOR))
    pushUnique(out, getAddress(LEGACY_BASE_MAINNET_FEE_COLLECTOR))
  }

  return out
}

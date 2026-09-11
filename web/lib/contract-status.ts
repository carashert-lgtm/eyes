/** On-chain deployment status for eyesopen.to (mainnet vs pending). */

const BASESCAN = 'https://basescan.org/address'

export type ContractRow = {
  id: string
  name: string
  address: string | null
  status: 'live' | 'pending' | 'verified'
  basescanUrl: string | null
  note: string
}

export type AuditStatus = {
  state: 'not_started' | 'in_progress' | 'published'
  label: string
  detail: string
  reportUrl: string | null
}

export type OwnershipStatus = {
  deployer: string | null
  multisigTarget: string | null
  /** @deprecated use platformAdminOnSafe */
  tokenOwnerIsMultisig: boolean
  platformAdminOnSafe: boolean
  note: string
}

export function getTrustChecklist(): string[] {
  return [
    'Compare every address below to BaseScan before sending ETH or launching.',
    'Confirm Base mainnet (chain ID 8453)—not Sepolia or another network.',
    'Verify treasury and fee collector addresses on this page before launching.',
    'On the $EYES token contract, confirm fixed supply—no mint function in the ABI.',
    'On the launch factory, confirm owner() matches our published Safe when transfer is complete.',
  ]
}

function addr(envKey: string): string | null {
  const v = process.env[envKey]?.trim()
  if (!v || !/^0x[0-9a-fA-F]{40}$/.test(v)) return null
  return v
}

export function getContractStatusRows(): ContractRow[] {
  const eyes = addr('NEXT_PUBLIC_EYES_TOKEN_ADDRESS')
  const factory = addr('NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS')
  const collector = addr('NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS')
  const treasury = collector ?? '0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5'

  return [
    {
      id: 'eyes',
      name: '$EYES token',
      address: eyes,
      status: eyes ? 'live' : 'pending',
      basescanUrl: eyes ? `${BASESCAN}/${eyes}` : null,
      note: 'Token-only deploy. Full supply minted to treasury at launch.',
    },
    {
      id: 'treasury',
      name: 'Platform treasury',
      address: treasury,
      status: 'live',
      basescanUrl: `${BASESCAN}/${treasury}`,
      note: 'Holds $EYES inventory and receives platform fee flows.',
    },
    {
      id: 'factory',
      name: 'Launch factory',
      address: factory,
      status: factory ? 'live' : 'pending',
      basescanUrl: factory ? `${BASESCAN}/${factory}` : null,
      note: 'Fair launch deploys via /app/create when factory address is wired in env.',
    },
    {
      id: 'collector',
      name: 'Fee collector',
      address: collector,
      status: collector ? 'live' : 'pending',
      basescanUrl: collector ? `${BASESCAN}/${collector}` : null,
      note: 'Routes launch trading fees to creators and the buy-and-burn queue.',
    },
  ]
}

export function getAuditStatus(): AuditStatus {
  const reportUrl = process.env.NEXT_PUBLIC_AUDIT_REPORT_URL?.trim() || null
  if (reportUrl) {
    return {
      state: 'published',
      label: 'Published',
      detail: 'External audit report linked below.',
      reportUrl,
    }
  }
  const inProgress = process.env.NEXT_PUBLIC_AUDIT_IN_PROGRESS === 'true'
  if (inProgress) {
    return {
      state: 'in_progress',
      label: 'In progress',
      detail: 'Audit booked. Report will be linked here when complete.',
      reportUrl: null,
    }
  }
  return {
    state: 'not_started',
    label: 'Not yet published',
    detail:
      'Smart contracts are experimental. An external audit is planned before public DEX liquidity. Live addresses and status are on /legal.',
    reportUrl: null,
  }
}

export function getOwnershipStatus(): OwnershipStatus {
  const deployer = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS?.trim() || null
  const multisig = process.env.NEXT_PUBLIC_MULTISIG_ADDRESS?.trim() || null
  const transferred = process.env.NEXT_PUBLIC_OWNERSHIP_TRANSFERRED === 'true'
  const platformAdminOnSafe = Boolean(multisig && transferred)
  return {
    deployer,
    multisigTarget: multisig,
    tokenOwnerIsMultisig: platformAdminOnSafe,
    platformAdminOnSafe,
    note: platformAdminOnSafe
      ? 'Factory, fee collector, and fee router admin are controlled by the Gnosis Safe below—confirm owner() on BaseScan. The $EYES token has no admin mint; its owner() field does not affect supply.'
      : multisig
        ? 'Safe address is configured. Confirm factory owner() on BaseScan matches the Safe.'
        : 'Deployer EOA may still hold contract admin until ownership transfer to the published Safe.',
  }
}

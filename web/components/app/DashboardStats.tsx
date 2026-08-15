'use client'

import { StatCard } from '@/components/app/StatCard'
import { STATUS } from '@/lib/site-config'
import { truncateAddress, useWallet } from '@/lib/wallet-context'

export function DashboardStats() {
  const { connected, address } = useWallet()

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <StatCard label="Network" value={STATUS.network} helper={STATUS.networkDetail} />
      <StatCard label="Launches indexed" value="0" helper="Testnet indexing pending" />
      <StatCard label="$EYES burned" value="—" helper="Coming soon" />
      <StatCard
        label="Your wallet"
        value={connected && address ? truncateAddress(address) : 'Not connected'}
        helper={connected ? 'Mock wallet active' : 'Connect to deploy'}
      />
    </div>
  )
}

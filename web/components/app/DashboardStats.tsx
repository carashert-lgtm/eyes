'use client'



import { useEffect, useState } from 'react'

import { StatCard } from '@/components/app/StatCard'

import { truncateAddress } from '@/lib/address-utils'

import { useAppWallet } from '@/hooks/useAppWallet'



export function DashboardStats() {

  const { address, isConnected, signedIn } = useAppWallet()

  const [launchCount, setLaunchCount] = useState<number | null>(null)

  const [launchHelper, setLaunchHelper] = useState('Loading from factory…')

  const [eyesBurned, setEyesBurned] = useState<string | null>(null)

  const [burnHelper, setBurnHelper] = useState('Reading on-chain…')



  useEffect(() => {

    fetch('/api/stats/eyes-burned')

      .then((r) => r.json())

      .then((d: { ok?: boolean; formatted?: string; stats?: { sentToDeadAddress?: number; burnedViaSupplyReduction?: number } }) => {

        if (!d.ok || !d.formatted) {

          setEyesBurned(null)

          setBurnHelper('Could not load burn total')

          return

        }

        setEyesBurned(d.formatted)

        const dead = d.stats?.sentToDeadAddress ?? 0

        const burned = d.stats?.burnedViaSupplyReduction ?? 0

        setBurnHelper(

          dead > 0 && burned > 0

            ? 'Launch fees, boosts, and buy & burn'

            : dead > 0

              ? 'Fees and boosts sent to burn address'

              : 'Live from $EYES total supply',

        )

      })

      .catch(() => {

        setEyesBurned(null)

        setBurnHelper('Could not load burn total')

      })

  }, [])



  useEffect(() => {

    fetch('/api/launches?limit=1')

      .then((r) => r.json())

      .then((d: { enabled?: boolean; total?: number; source?: string }) => {

        if (d.enabled === false) {

          setLaunchCount(0)

          setLaunchHelper('Discovery disabled')

          return

        }

        setLaunchCount(typeof d.total === 'number' ? d.total : 0)

        setLaunchHelper(

          d.source === 'indexer'
            ? 'Base, Ethereum, and Solana factories'
            : 'Indexed on-chain',

        )

      })

      .catch(() => {

        setLaunchCount(null)

        setLaunchHelper('Could not load launch count')

      })

  }, [])



  return (

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">

      <StatCard label="Launch on" value="Multi-chain" helper="Base · Ethereum · Solana" />

      <StatCard

        label="Launches indexed"

        value={launchCount === null ? '…' : String(launchCount)}

        helper={launchHelper}

      />

      <StatCard
        label="$EYES burned"
        value={eyesBurned ?? '…'}
        helper={burnHelper}
      />

      <StatCard

        label="Your wallet"

        value={isConnected && address ? truncateAddress(address) : signedIn ? 'Locked' : 'Not signed in'}

        helper={isConnected ? 'Ready to sign' : signedIn ? 'Profile → unlock wallet' : 'Sign in on Profile'}

      />

    </div>

  )

}


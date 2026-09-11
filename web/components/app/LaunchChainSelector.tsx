'use client'

import { cn } from '@/lib/utils'
import { useLaunchChain } from '@/lib/launch-chains/context'
import type { LaunchChainKey } from '@/lib/launch-chains/registry'

export function LaunchChainSelector() {
  const { chain, chains, setChainKey } = useLaunchChain()

  if (chains.length <= 1) return null

  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <label htmlFor="launch-network" className="font-mono-label text-muted-foreground">
        Launch network
      </label>
      <select
        id="launch-network"
        value={chain.key}
        onChange={(e) => setChainKey(e.target.value as LaunchChainKey)}
        className={cn(
          'mt-2 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground',
          'outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
        )}
      >
        {chains.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
            {option.comingSoon && !option.deployEnabled ? ' · coming soon' : ''}
            {option.deployEnabled ? ' · live' : ''}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        One universal Eyes wallet for every network. $EYES fees settle on Base; fund{' '}
        {chain.nativeSymbol} on {chain.label} via the network tab on your wallet card.
        {chain.comingSoon && !chain.deployEnabled
          ? ` On-chain deploy on ${chain.label} is still being wired.`
          : null}
      </p>
    </div>
  )
}

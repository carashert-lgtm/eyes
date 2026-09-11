'use client'

import type { LaunchChainConfig } from '@/lib/launch-chains/registry'
import { cn } from '@/lib/utils'

/** Selected launch network — create page only. */
export function LaunchNetworkBadge({
  chain,
  className,
}: {
  chain: LaunchChainConfig
  className?: string
}) {
  const live = chain.deployEnabled && !chain.comingSoon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium',
        live
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-border bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      {live ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
      {chain.label}
      {live ? ' · live' : chain.comingSoon ? ' · coming soon' : null}
    </span>
  )
}

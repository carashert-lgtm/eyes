'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { truncateAddress } from '@/lib/address-utils'
import { cn } from '@/lib/utils'

type CopyAddressInlineProps = {
  address: string
  className?: string
}

/** Truncated address with one-click copy of the full value. */
export function CopyAddressInline({ address, className }: CopyAddressInlineProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <code className="font-mono text-xs text-foreground">{truncateAddress(address)}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy full address"
        className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-xs text-foreground hover:border-primary/40"
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

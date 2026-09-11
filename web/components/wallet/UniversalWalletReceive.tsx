'use client'



import { useState } from 'react'

import { AlertTriangle, Check, Copy } from 'lucide-react'

import { cn } from '@/lib/utils'

import { truncateAddress } from '@/lib/address-utils'

import {

  acceptedAssetsForNetwork,

  depositAddressForNetwork,

  depositHintForNetwork,

  explorerUrlForNetwork,

  networkOnlyWarning,

  WALLET_NETWORK_OPTIONS,

  type WalletNetworkKey,

} from '@/lib/wallet-unified'



type UniversalWalletReceiveProps = {

  evmAddress: string | null

  solanaAddress: string | null

  /** Which network tab is selected first. */

  defaultNetwork?: WalletNetworkKey

  /** Hide network tabs — show only the address for this network. */

  fixedNetwork?: WalletNetworkKey

  compact?: boolean

  className?: string

  onCopy?: (address: string, network: WalletNetworkKey) => void

}



export function UniversalWalletReceive({

  evmAddress,

  solanaAddress,

  defaultNetwork = 'base',

  fixedNetwork,

  compact,

  className,

  onCopy,

}: UniversalWalletReceiveProps) {

  const [network, setNetwork] = useState<WalletNetworkKey>(fixedNetwork ?? defaultNetwork)

  const [copied, setCopied] = useState(false)



  const activeNetwork = fixedNetwork ?? network

  const activeOption = WALLET_NETWORK_OPTIONS.find((o) => o.key === activeNetwork)!

  const depositAddress = depositAddressForNetwork(activeNetwork, evmAddress, solanaAddress)

  const explorer = depositAddress ? explorerUrlForNetwork(activeNetwork, depositAddress) : null

  const acceptedAssets = acceptedAssetsForNetwork(activeNetwork)

  const showTabs = !fixedNetwork



  async function copy() {

    if (!depositAddress) return

    await navigator.clipboard.writeText(depositAddress)

    setCopied(true)

    onCopy?.(depositAddress, activeNetwork)

    window.setTimeout(() => setCopied(false), 2000)

  }



  return (

    <div className={cn('rounded-sm border border-border bg-background p-4', className)}>

      <div className="flex flex-wrap items-center justify-between gap-2">

        <p className="font-mono-label text-[0.65rem] text-muted-foreground">

          Universal deposit address

        </p>

        {showTabs ? (

          <div className="flex flex-wrap gap-1">

            {WALLET_NETWORK_OPTIONS.map((option) => (

              <button

                key={option.key}

                type="button"

                onClick={() => setNetwork(option.key)}

                className={cn(

                  'rounded-sm border px-2 py-0.5 font-mono-label text-[0.58rem] transition-colors',

                  activeNetwork === option.key

                    ? 'border-primary/50 bg-primary/10 text-primary'

                    : 'border-border text-muted-foreground hover:text-foreground',

                )}

              >

                {option.shortLabel}

              </button>

            ))}

          </div>

        ) : null}

      </div>



      {showTabs ? (

        <div className="mt-3 grid gap-2 sm:grid-cols-3">

          {WALLET_NETWORK_OPTIONS.map((option) => {

            const assets = acceptedAssetsForNetwork(option.key)

            const isActive = option.key === activeNetwork

            return (

              <button

                key={option.key}

                type="button"

                onClick={() => setNetwork(option.key)}

                className={cn(

                  'rounded-sm border px-3 py-2 text-left transition-colors',

                  isActive

                    ? 'border-primary/40 bg-primary/5'

                    : 'border-border bg-surface hover:border-primary/20',

                )}

              >

                <p

                  className={cn(

                    'font-mono-label text-[0.58rem]',

                    isActive ? 'text-primary' : 'text-muted-foreground',

                  )}

                >

                  {option.label}

                </p>

                <div className="mt-1.5 flex flex-wrap gap-1">

                  {assets.map((asset) => (

                    <span

                      key={asset.symbol}

                      className={cn(

                        'rounded-sm border px-1.5 py-0.5 font-mono-label text-[0.55rem]',

                        isActive

                          ? 'border-primary/30 text-foreground'

                          : 'border-border text-muted-foreground',

                      )}

                    >

                      {asset.symbol}

                    </span>

                  ))}

                </div>

              </button>

            )

          })}

        </div>

      ) : null}



      {depositAddress ? (

        <>

          <div

            className={cn(

              'mt-3 flex items-start gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2',

              compact && 'text-[0.65rem]',

            )}

          >

            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />

            <div className="min-w-0 space-y-1">

              <p className="text-xs font-medium text-foreground">

                {activeOption.label} only — {acceptedAssets.map((a) => a.symbol).join(' · ')}

              </p>

              <p className="text-[0.65rem] leading-relaxed text-muted-foreground">

                {networkOnlyWarning(activeNetwork)}

              </p>

            </div>

          </div>



          <div className="mt-3 flex flex-wrap items-center gap-2">

            <code

              className={cn(

                'font-mono text-primary break-all',

                compact ? 'text-xs' : 'text-sm sm:text-base',

              )}

            >

              {compact ? truncateAddress(depositAddress) : depositAddress}

            </code>

            <button

              type="button"

              onClick={() => void copy()}

              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-foreground hover:border-primary/40"

            >

              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}

              {copied ? 'Copied' : 'Copy'}

            </button>

            {explorer ? (

              <a

                href={explorer}

                target="_blank"

                rel="noopener noreferrer"

                className="text-xs text-primary hover:underline"

              >

                Explorer

              </a>

            ) : null}

          </div>



          <div className="mt-3 flex flex-wrap gap-1.5">

            {acceptedAssets.map((asset) => (

              <span

                key={asset.symbol}

                className="inline-flex items-center gap-1 rounded-sm border border-primary/25 bg-primary/5 px-2 py-0.5 text-[0.65rem] text-foreground"

              >

                <span className="font-mono-label text-primary">{asset.symbol}</span>

                <span className="text-muted-foreground">{asset.label.replace(`${asset.symbol} `, '')}</span>

              </span>

            ))}

          </div>



          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">

            {depositHintForNetwork(activeNetwork)}

          </p>

          {activeNetwork !== 'solana' ? (

            <p className="mt-2 text-[0.65rem] text-muted-foreground">

              Base and Ethereum share the same 0x — pick the tab that matches the network you are

              sending from.

            </p>

          ) : (

            <p className="mt-2 text-[0.65rem] text-muted-foreground">

              Solana uses a different address format. $EYES always lives on Base — send $EYES to the

              Base tab, not here.

            </p>

          )}

        </>

      ) : (

        <p className="mt-3 text-xs text-muted-foreground">

          {activeNetwork === 'solana'

            ? 'Unlock your Eyes wallet to reveal your paired Solana deposit address.'

            : 'Sign in to load your Eyes wallet address.'}

        </p>

      )}

    </div>

  )

}



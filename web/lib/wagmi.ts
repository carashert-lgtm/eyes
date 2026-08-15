import { injected } from '@wagmi/core'
import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

// Single source of truth for the presale chain.
export const PRESALE_CHAIN = baseSepolia

// Injected only (MetaMask, Rabby, etc.) — avoids heavy optional connector deps at build time.
export const wagmiConfig = createConfig({
  chains: [PRESALE_CHAIN],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [PRESALE_CHAIN.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

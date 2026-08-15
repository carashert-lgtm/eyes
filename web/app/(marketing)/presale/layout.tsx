import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Web3Provider } from '@/components/providers/Web3Provider'

export const metadata: Metadata = {
  title: 'Presale · Eyes Open ($EYES)',
  description:
    'A 14-day, self-custodial pre-launch growth pool for Eyes Open ($EYES). Wallet-only, no fiat, no accounts — you sign every transaction. Not financial advice.',
}

export default function PresaleLayout({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>
}

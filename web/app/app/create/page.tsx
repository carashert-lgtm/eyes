import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { CreateLaunchForm } from '@/components/app/CreateLaunchForm'
import { LaunchChainProvider } from '@/lib/launch-chains/context'

export const metadata: Metadata = {
  title: 'Create Launch | Eyes Open ($EYES)',
  description:
    'Deploy a fair launch on Base, Ethereum, or Solana with Eyes Window gating and permanent LP lock.',
}

export default function CreateLaunchPage() {
  return (
    <AppShell>
      <LaunchChainProvider>
        <CreateLaunchForm />
      </LaunchChainProvider>
    </AppShell>
  )
}

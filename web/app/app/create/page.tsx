import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { CreateLaunchForm } from '@/components/app/CreateLaunchForm'

export const metadata: Metadata = {
  title: 'Create Launch | Eyes Open ($EYES)',
  description:
    'Deploy a fair launch with Eyes Window gating and permanent LP lock on Eyes Open testnet.',
}

export default function CreateLaunchPage() {
  return (
    <AppShell>
      <CreateLaunchForm />
    </AppShell>
  )
}

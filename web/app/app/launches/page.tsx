import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { LaunchesDiscovery } from '@/components/app/LaunchesDiscovery'

export const metadata: Metadata = {
  title: 'Launches | Eyes Open ($EYES)',
  description:
    'Browse fair launches on Eyes Open — Eyes Window gating and permanent LP lock on every launch.',
}

export default function LaunchesPage() {
  return (
    <AppShell>
      <LaunchesDiscovery />
    </AppShell>
  )
}

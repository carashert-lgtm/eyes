import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { DashboardHome } from '@/components/app/DashboardHome'

export const metadata: Metadata = {
  title: 'Launch App | Eyes Open ($EYES)',
  description:
    'Eyes Open fair-launch pad — create launches, browse discovery, and contribute to launch support on Base Sepolia testnet.',
}

export default function AppDashboardPage() {
  return (
    <AppShell>
      <DashboardHome />
    </AppShell>
  )
}

import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { LaunchSupportContribute } from '@/components/app/LaunchSupportContribute'

export const metadata: Metadata = {
  title: 'Launch Support | Eyes Open ($EYES)',
  description:
    '14-day pre-launch community bootstrap window. Contributions fund launch visibility and distribution — separate from trading-fee tokenomics.',
}

export default function AppSupportPage() {
  return (
    <AppShell>
      <LaunchSupportContribute />
    </AppShell>
  )
}

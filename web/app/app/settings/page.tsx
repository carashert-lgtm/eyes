import type { Metadata } from 'next'
import { AppShell } from '@/components/app/AppShell'
import { SettingsPage } from '@/components/app/SettingsPage'

export const metadata: Metadata = {
  title: 'Settings | Eyes Open ($EYES)',
  description:
    'Manage your Eyes account, developer API keys, launch webhooks, notifications, and security settings.',
}

export default function SettingsRoutePage() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  )
}

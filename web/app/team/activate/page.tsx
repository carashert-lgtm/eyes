import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TeamActivateForm } from '@/components/team/TeamActivateForm'

export const metadata: Metadata = {
  title: 'Team Space · Activate | Eyes Open',
  description: 'Private team area — enter your one-time activation code.',
  robots: { index: false, follow: false },
}

export default function TeamActivatePage() {
  return (
    <Suspense>
      <TeamActivateForm />
    </Suspense>
  )
}

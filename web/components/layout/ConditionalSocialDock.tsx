'use client'

import { usePathname } from 'next/navigation'
import { SocialFloatingDock } from '@/components/layout/SocialFloatingDock'

export function ConditionalSocialDock() {
  const pathname = usePathname()
  if (pathname?.startsWith('/embed/')) return null
  return <SocialFloatingDock />
}

import { SITE_URL } from '@/lib/chain-config'

/** Update when legal copy changes materially. */
export const LEGAL_LAST_UPDATED = '2026-08-21'

export const LEGAL_ENTITY =
  process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || 'Eyes Open'

export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || 'legal@eyesopen.to'

export const LEGAL_PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || 'privacy@eyesopen.to'

export const LEGAL_SITE_URL = SITE_URL

export const LEGAL_GOVERNING_LAW =
  process.env.NEXT_PUBLIC_LEGAL_GOVERNING_LAW?.trim() || 'the State of Delaware, United States'

export const LEGAL_ARBITRATION_VENUE =
  process.env.NEXT_PUBLIC_LEGAL_ARBITRATION_VENUE?.trim() || 'Delaware, United States'

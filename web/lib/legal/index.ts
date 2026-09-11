import type { LegalDocument } from './types'
import { trustVerification } from './trust-verification'
import { aiDisclosure } from './ai-disclosure'
import { cookiePolicy } from './cookies'
import { privacyPolicy } from './privacy'
import { riskDisclosure } from './risk-disclosure'
import { termsOfService } from './terms'

export const TRUST_DOCUMENT: LegalDocument = trustVerification

export const POLICY_DOCUMENTS: LegalDocument[] = [
  riskDisclosure,
  termsOfService,
  privacyPolicy,
  cookiePolicy,
  aiDisclosure,
]

export const LEGAL_DOCUMENTS: LegalDocument[] = [trustVerification, ...POLICY_DOCUMENTS]

export const LEGAL_DOCUMENT_BY_SLUG: Record<string, LegalDocument> = Object.fromEntries(
  LEGAL_DOCUMENTS.map((doc) => [doc.slug, doc]),
)

export const LEGAL_NAV = LEGAL_DOCUMENTS.map((doc) => ({
  slug: doc.slug,
  title: doc.title,
  href: `/legal/${doc.slug}`,
}))

/** Footer / compact nav — hub first, then essentials */
export const LEGAL_FOOTER_LINKS = [
  { title: 'Trust & verification', href: '/legal#trust' },
  { title: 'All policies', href: '/legal#policies' },
  { title: 'Risk disclosure', href: '/legal/risk-disclosure' },
  { title: 'Terms', href: '/legal/terms' },
  { title: 'Privacy', href: '/legal/privacy' },
]

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENT_BY_SLUG[slug]
}

import type { LegalDocument } from './types'
import { LEGAL_PRIVACY_EMAIL, LEGAL_SITE_URL } from './meta'

export const cookiePolicy: LegalDocument = {
  slug: 'cookies',
  title: 'Cookie Policy',
  description: `How ${LEGAL_SITE_URL} uses cookies and similar technologies.`,
  summary: 'Cookies we use and how to control them.',
  sections: [
    {
      id: 'what',
      title: '1. What are cookies',
      paragraphs: [
        'Cookies are small text files stored on your device when you visit a website. Similar technologies include local storage and session identifiers.',
      ],
    },
    {
      id: 'how-we-use',
      title: '2. How we use cookies',
      paragraphs: ['We use cookies and similar technologies to:'],
      bullets: [
        'Keep you signed in to Team Space (session cookie).',
        'Remember wallet connection state via wagmi / WalletConnect (may use local storage).',
        'Maintain security and prevent abuse (e.g. rate limiting at infrastructure level).',
        'Understand site performance through hosting provider analytics where enabled.',
      ],
    },
    {
      id: 'types',
      title: '3. Types of cookies',
      bullets: [
        'Strictly necessary: required for core functionality (Team Space session, security). These do not require consent in many jurisdictions.',
        'Functional: wallet connection preferences and UI state.',
        'Analytics: aggregated usage metrics if our host or analytics tools set them—review your browser and host settings.',
      ],
      paragraphs: [
        'We do not use cookies to sell personal data. We do not operate third-party advertising cookies on the core site flow as of the last updated date above.',
      ],
    },
    {
      id: 'third-party',
      title: '4. Third-party cookies',
      paragraphs: [
        'Wallet extensions, Discord embeds, and block explorer links may set their own cookies when you interact with them. We do not control those technologies.',
      ],
    },
    {
      id: 'control',
      title: '5. Your choices',
      paragraphs: [
        'You can block or delete cookies in your browser settings. Blocking strictly necessary cookies may break Team Space login or wallet features.',
        'Use private browsing or disconnect wallets when using shared devices.',
      ],
    },
    {
      id: 'contact',
      title: '6. Contact',
      paragraphs: [`Questions: ${LEGAL_PRIVACY_EMAIL}. See also our Privacy Policy at ${LEGAL_SITE_URL}/legal/privacy.`],
    },
  ],
}

import type { LegalDocument } from './types'
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_PRIVACY_EMAIL, LEGAL_SITE_URL } from './meta'

export const privacyPolicy: LegalDocument = {
  slug: 'privacy',
  title: 'Privacy Policy',
  description: `How ${LEGAL_ENTITY} collects, uses, and protects personal data when you use ${LEGAL_SITE_URL} and related services.`,
  summary: 'What data we collect, why, and your choices.',
  sections: [
    {
      id: 'intro',
      title: '1. Introduction',
      paragraphs: [
        `${LEGAL_ENTITY} ("Eyes Open," "we," "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect information when you use ${LEGAL_SITE_URL}, our web application, APIs, Discord bot, Team Space, and related services (the "Services").`,
        'This Policy applies together with our Terms of Service, Cookie Policy, and Risk Disclosure.',
      ],
    },
    {
      id: 'controller',
      title: '2. Who is responsible for your data',
      paragraphs: [
        `For purposes of applicable data protection laws, ${LEGAL_ENTITY} is the controller of personal data processed through the Services unless we state otherwise.`,
        `Privacy inquiries: ${LEGAL_PRIVACY_EMAIL}. General legal: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: 'collect',
      title: '3. Information we collect',
      paragraphs: ['We may collect the following categories of information:'],
      bullets: [
        'Wallet and blockchain data: public wallet addresses you submit (linked wallet, payment tx hashes), on-chain transaction metadata we verify via RPC providers, and token balances visible on public blockchains.',
        'Discord and community data: Discord user ID, username, server membership signals, invite tracking (if enabled), messages containing bot commands (!linkwallet, !claim, etc.), and staff log entries.',
        'Team Space data: activation codes, session cookies, Discord ID linked to team pool allocations.',
        'Referral and program data: referral codes, click/join counters, on-chain amounts verified where applicable, allocation status.',
        'Technical data: IP address, browser type, device identifiers, pages viewed, timestamps, and error logs collected by our host (e.g. Vercel) and bot infrastructure (e.g. Railway).',
        'Communications: emails or support messages you send us.',
        'Cookies and similar technologies: see our Cookie Policy.',
      ],
    },
    {
      id: 'sources',
      title: '4. How we collect information',
      paragraphs: [
        'Directly from you when you use forms, connect wallets, interact with the Discord bot, or contact us.',
        'Automatically through cookies, logs, and analytics when you browse the site.',
        'From public blockchains and block explorers when we verify transactions.',
        'From Discord and other platforms when you use integrated features, subject to their policies.',
      ],
    },
    {
      id: 'use',
      title: '5. How we use information',
      paragraphs: ['We use information to:'],
      bullets: [
        'Operate and improve the Services (launch registration, token queue, team pool, referrals).',
        'Verify on-chain payments and prevent duplicate or fraudulent registrations.',
        'Authenticate Team Space sessions and enforce activation code rules.',
        'Send operational notices (e.g. security incidents) where appropriate.',
        'Monitor abuse, enforce Terms, and protect security.',
        'Comply with legal obligations and respond to lawful requests.',
        'Generate aggregated, de-identified statistics (e.g. platform usage totals).',
      ],
    },
    {
      id: 'legal-bases',
      title: '6. Legal bases (EEA/UK users)',
      paragraphs: [
        'Where GDPR or UK GDPR applies, we process personal data based on: performance of a contract (providing Services you request), legitimate interests (security, fraud prevention, improving Services), compliance with legal obligations, and consent where required (e.g. non-essential cookies).',
        'You may withdraw consent where processing is consent-based without affecting prior lawful processing.',
      ],
    },
    {
      id: 'share',
      title: '7. How we share information',
      paragraphs: [
        'We do not sell your personal information. We may share information with:',
      ],
      bullets: [
        'Infrastructure providers: hosting (Vercel), bot hosting (Railway), database storage, RPC/node providers— solely to operate the Services.',
        'Discord: when you use bot commands or Team Space features governed by Discord\'s policies.',
        'Professional advisers: lawyers, auditors, or insurers under confidentiality obligations.',
        'Authorities: when required by law, court order, or to protect rights and safety.',
        'Business transfers: in connection with merger, acquisition, or asset sale, with notice where required.',
      ],
    },
    {
      id: 'international',
      title: '8. International transfers',
      paragraphs: [
        'We and our processors may store or process data in the United States and other countries. Where required, we implement appropriate safeguards (such as Standard Contractual Clauses) for cross-border transfers.',
      ],
    },
    {
      id: 'retention',
      title: '9. Data retention',
      paragraphs: [
        'We retain information as long as needed to provide the Services, resolve disputes, enforce agreements, and comply with law.',
        'Program records and allocation history may be retained for accounting, audit, and legal compliance for several years.',
        'Logs may be retained for shorter periods unless needed for security investigations.',
      ],
    },
    {
      id: 'security',
      title: '10. Security',
      paragraphs: [
        'We use reasonable administrative, technical, and organizational measures to protect information. No method of transmission or storage is 100% secure.',
        'Treasury signing keys and API secrets are stored in secured environment variables, not in public code. You must still protect your own wallet keys.',
        'Report suspected security issues to ' + LEGAL_CONTACT_EMAIL + '.',
      ],
    },
    {
      id: 'rights',
      title: '11. Your rights and choices',
      paragraphs: [
        'Depending on your location, you may have rights to access, correct, delete, restrict, or port personal data, and to object to certain processing.',
        'California residents may have additional rights under the CCPA/CPRA, including knowing categories collected and requesting deletion (subject to exceptions).',
        'To exercise rights, email ' +
          LEGAL_PRIVACY_EMAIL +
          ' with sufficient detail to verify your identity. We may decline requests where permitted by law.',
        'You may unlink wallets by contacting us; on-chain data cannot be deleted from public blockchains.',
      ],
    },
    {
      id: 'children',
      title: '12. Children',
      paragraphs: [
        'The Services are not directed to anyone under 18. We do not knowingly collect personal data from children. If you believe a child provided data, contact us and we will delete it where appropriate.',
      ],
    },
    {
      id: 'third-party-links',
      title: '13. Third-party links',
      paragraphs: [
        'The Services may link to BaseScan, social networks, wallet apps, and other sites. Their privacy practices are not covered by this Policy.',
      ],
    },
    {
      id: 'changes',
      title: '14. Changes to this Policy',
      paragraphs: [
        'We may update this Privacy Policy. The "Last updated" date will change. Material updates may be posted on the site or Discord.',
      ],
    },
    {
      id: 'contact',
      title: '15. Contact',
      paragraphs: [`Privacy: ${LEGAL_PRIVACY_EMAIL}. Website: ${LEGAL_SITE_URL}.`],
    },
  ],
}

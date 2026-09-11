import type { LegalDocument } from './types'
import { LEGAL_ARBITRATION_VENUE, LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_GOVERNING_LAW, LEGAL_SITE_URL } from './meta'

export const termsOfService: LegalDocument = {
  slug: 'terms',
  title: 'Terms of Service',
  description: `Terms governing use of ${LEGAL_SITE_URL}, the Eyes Open launch platform, Discord bot, and related services.`,
  summary: 'Rules for using the site, launch platform, Discord bot, and Team Space.',
  sections: [
    {
      id: 'acceptance',
      title: '1. Acceptance of these Terms',
      paragraphs: [
        `These Terms of Service ("Terms") are a binding agreement between you and ${LEGAL_ENTITY} ("Eyes Open," "we," "us," or "our") governing access to and use of our website at ${LEGAL_SITE_URL}, related applications, the Eyes Open Discord bot, Team Space, fair-launch tools, and any other services we make available (collectively, the "Services").`,
        'By accessing or using the Services, connecting a wallet, linking a Discord account, or clicking to accept where presented, you agree to these Terms, our Privacy Policy, Cookie Policy, Risk Disclosure, and AI Disclosure. If you do not agree, do not use the Services.',
        'If you use the Services on behalf of an organization, you represent that you have authority to bind that organization.',
      ],
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      paragraphs: [
        'You must be at least 18 years old (or the age of majority in your jurisdiction, whichever is higher) and legally capable of entering into a binding contract.',
        'You may not use the Services if you are located in, ordinarily resident in, or a citizen of any jurisdiction where use of cryptocurrency, token participation, or the Services would be illegal or require registration we have not obtained.',
        'You are solely responsible for determining whether your use of the Services complies with applicable laws, including sanctions, export controls, securities laws, tax laws, and gambling or money-transmission rules.',
      ],
      bullets: [
        'We do not target or solicit users in prohibited jurisdictions.',
        'We may block access by IP, wallet address, or account where required or permitted by law.',
      ],
    },
    {
      id: 'not-advice',
      title: '3. No financial, legal, or tax advice',
      paragraphs: [
        'All content on the Services—including pricing tiers, tokenomics descriptions, marketing copy, Discord messages, documentation, and AI-generated summaries—is provided for general information only.',
        'Nothing on the Services constitutes investment advice, financial advice, trading advice, legal advice, tax advice, or a recommendation to buy, sell, or hold any asset. Eyes Open is not a broker, dealer, investment adviser, exchange, bank, or money transmitter.',
        'You should consult qualified professionals before making financial or legal decisions. Past performance, testnet results, or simulated outcomes do not guarantee future results.',
      ],
    },
    {
      id: 'nature-of-services',
      title: '4. Nature of the Services',
      paragraphs: [
        'Eyes Open provides software and community tools related to fair-launch infrastructure and the $EYES token ecosystem on Base and other supported networks.',
        'Platform features may involve voluntary on-chain transfers to published treasury or fee addresses. These are not securities offerings, brokerage services, or custodial products unless applicable law in your jurisdiction determines otherwise—in which case you must not participate.',
        'Smart contracts, when deployed, are experimental software. Interfaces may reference contracts that are not yet deployed, under audit, or on testnet only. Always verify network, chain ID, and contract addresses on an official block explorer before transacting.',
      ],
    },
    {
      id: 'self-custody',
      title: '5. Self-custody and wallet security',
      paragraphs: [
        'You connect and use non-custodial wallets at your own risk. We never ask for seed phrases, private keys, or wallet passwords.',
        'You are solely responsible for the security of your devices, wallets, and private keys. Lost keys, phishing, malware, and user error can result in permanent loss of assets. We cannot recover lost funds or reverse blockchain transactions.',
        'Wallet addresses you provide (!linkwallet, Team Space, launch registration) must be accurate. Incorrect addresses may result in irreversible loss.',
      ],
    },
    {
      id: 'launches',
      title: '6. Fair launches and token distribution',
      paragraphs: [
        'Fair launch features are subject to published availability, fee schedules, allocation caps, and technical readiness. We may modify, pause, or terminate launch tools without liability where required for security, compliance, or operational reasons.',
        'On-chain transfers to published addresses are irreversible. Token delivery from treasury or team programs is best-effort and may require manual or automated processing. Delays, failures, or retries may occur.',
        'You have no right to interest, profits, or guaranteed delivery timelines unless explicitly stated in a separate written agreement signed by us.',
        'Referral rewards, team pool allocations, Discord invite rewards, and similar programs are discretionary promotional mechanics, not wages or guaranteed entitlements, and may change or end at any time.',
      ],
    },
    {
      id: 'prohibited',
      title: '7. Prohibited conduct',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Violate any applicable law or regulation.',
        'Use the Services for fraud, money laundering, terrorist financing, or sanctions evasion.',
        'Impersonate Eyes Open, staff, or other users.',
        'Scrape, attack, or disrupt the Services (including DDoS, exploit attempts, or unauthorized API access).',
        'Submit false registrations, sybil referrals, or manipulated Discord activity.',
        'Circumvent geographic, allocation, or rate limits.',
        'Use the Services to distribute malware or unlawful content.',
        'Misrepresent affiliation with Eyes Open or guarantee returns to third parties.',
      ],
    },
    {
      id: 'ip',
      title: '8. Intellectual property',
      paragraphs: [
        'The Services, including branding, design, code (except open-source portions under their licenses), and content, are owned by Eyes Open or licensors and protected by intellectual property laws.',
        'We grant you a limited, revocable, non-exclusive, non-transferable license to access and use the Services for personal, non-commercial purposes in accordance with these Terms.',
        'You may not copy, modify, distribute, or create derivative works from our proprietary materials without prior written consent, except where open-source licenses explicitly allow.',
      ],
    },
    {
      id: 'third-party',
      title: '9. Third-party services',
      paragraphs: [
        'The Services integrate or link to third parties including wallet providers (e.g. MetaMask, Coinbase Wallet), Discord, Telegram, Vercel, Railway, block explorers, RPC providers, and QR code services.',
        'We do not control third-party services and are not responsible for their availability, security, terms, or actions. Your use of third-party services is governed by their terms.',
      ],
    },
    {
      id: 'disclaimers',
      title: '10. Disclaimers',
      paragraphs: [
        'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
        'We do not warrant that the Services will be uninterrupted, error-free, secure, or free of harmful components, or that smart contracts are bug-free or audited unless we explicitly publish an audit report for a specific deployed version.',
        'See our Risk Disclosure for additional crypto-specific warnings.',
      ],
    },
    {
      id: 'liability',
      title: '11. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, EYES OPEN AND ITS FOUNDERS, OFFICERS, EMPLOYEES, CONTRACTORS, AND AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, DIGITAL ASSETS, OR OTHER INTANGIBLE LOSSES, ARISING FROM OR RELATED TO THE SERVICES OR THESE TERMS.',
        'OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) ONE HUNDRED U.S. DOLLARS (USD $100) OR (B) THE AMOUNT YOU PAID TO US IN FEES FOR THE SERVICES IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM (EXCLUDING VOLUNTARY BLOCKCHAIN TRANSFERS TO TREASURY, WHICH ARE NOT PAYMENTS TO US FOR SERVICES).',
        'Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability is limited to the fullest extent permitted by law.',
      ],
    },
    {
      id: 'indemnity',
      title: '12. Indemnification',
      paragraphs: [
        'You agree to defend, indemnify, and hold harmless Eyes Open and its personnel from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys\' fees) arising from your use of the Services, your violation of these Terms, your violation of any law or third-party rights, or your blockchain transactions.',
      ],
    },
    {
      id: 'termination',
      title: '13. Suspension and termination',
      paragraphs: [
        'We may suspend or terminate access to the Services, Discord roles, or Team Space at any time, with or without notice, for any reason including suspected abuse, compliance risk, or security incidents.',
        'Provisions that by nature should survive termination (including disclaimers, limitation of liability, indemnity, governing law, and dispute resolution) will survive.',
      ],
    },
    {
      id: 'changes',
      title: '14. Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. The "Last updated" date at the top of this page will change when we do. Material changes may be announced on the site or Discord.',
        'Continued use after changes become effective constitutes acceptance. If you do not agree to updated Terms, stop using the Services.',
      ],
    },
    {
      id: 'disputes',
      title: '15. Governing law and disputes',
      paragraphs: [
        `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your country of residence require otherwise.`,
        'Before filing a claim, you agree to contact us at ' +
          LEGAL_CONTACT_EMAIL +
          ' and attempt to resolve the dispute informally for at least thirty (30) days.',
        `Except where prohibited by law, any dispute not resolved informally will be resolved by binding individual arbitration in ${LEGAL_ARBITRATION_VENUE}, rather than in court, except that either party may seek injunctive relief in court for intellectual property or unauthorized access.`,
        'YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE ACTION TO THE FULLEST EXTENT PERMITTED BY LAW.',
      ],
    },
    {
      id: 'contact',
      title: '16. Contact',
      paragraphs: [`Questions about these Terms: ${LEGAL_CONTACT_EMAIL}. Website: ${LEGAL_SITE_URL}.`],
    },
  ],
}

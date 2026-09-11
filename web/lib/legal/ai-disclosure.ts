import type { LegalDocument } from './types'
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_SITE_URL } from './meta'

export const aiDisclosure: LegalDocument = {
  slug: 'ai',
  title: 'AI Disclosure',
  description:
    'How Eyes Open uses artificial intelligence tools in development, content, and support.',
  summary: 'Where AI is used and why you should verify important facts yourself.',
  sections: [
    {
      id: 'overview',
      title: '1. Overview',
      paragraphs: [
        `${LEGAL_ENTITY} ("Eyes Open") may use artificial intelligence ("AI") systems—including large language models and code assistants—in building, operating, and communicating about the Services.`,
        'AI is a tool, not a substitute for professional advice or human judgment.',
      ],
    },
    {
      id: 'uses',
      title: '2. How we may use AI',
      bullets: [
        'Drafting or editing website copy, FAQs, documentation, and marketing materials (human review may vary).',
        'Assisting software development, tests, and DevOps scripts.',
        'Generating summaries of community questions or internal runbooks.',
        'Discord or support draft responses reviewed before sending (when applicable).',
        'Analyzing aggregated, non-sensitive operational data.',
      ],
      paragraphs: [],
    },
    {
      id: 'limitations',
      title: '3. Limitations and accuracy',
      bullets: [
        'AI can produce incorrect, incomplete, or outdated information ("hallucinations").',
        'AI may not know current on-chain state, treasury balance, launch status, or deployment status.',
        'AI must never be trusted for wallet addresses, private keys, seed phrases, or send instructions—always verify on eyesopen.to and BaseScan.',
        'AI output is not financial, legal, tax, or investment advice.',
      ],
      paragraphs: [],
    },
    {
      id: 'no-training',
      title: '4. Your data and AI providers',
      paragraphs: [
        'We do not intentionally provide your private keys or seed phrases to AI tools.',
        'If you paste sensitive data into public channels or third-party AI products, those providers\' terms apply—not this disclosure.',
        'Operational use of AI services may involve subprocessors bound by confidentiality and data processing terms where applicable.',
      ],
    },
    {
      id: 'community',
      title: '5. Community and third-party AI',
      paragraphs: [
        'Community members, influencers, or third parties may use AI to discuss Eyes Open. We are not responsible for their AI-generated content.',
        'Official statements are those published on eyesopen.to, verified social accounts, or pinned Discord announcements from staff.',
      ],
    },
    {
      id: 'automated-decisions',
      title: '6. Automated processing',
      paragraphs: [
        'Some Service features use automated rules (e.g. verifying tx hashes, calculating tier allocations, referral counters). These are not generative AI but are algorithmic.',
        'Significant adverse decisions (e.g. blocking abuse) may involve human review where feasible.',
      ],
    },
    {
      id: 'your-responsibility',
      title: '7. Your responsibility',
      paragraphs: [
        'Before sending funds, claiming tokens, or linking wallets, verify facts from primary sources: eyesopen.to, official treasury address on BaseScan, and your wallet app.',
        'If AI-assisted chat or docs conflict with the website or blockchain state, the website and chain prevail.',
      ],
    },
    {
      id: 'contact',
      title: '8. Contact',
      paragraphs: [
        `Report incorrect official content possibly influenced by AI: ${LEGAL_CONTACT_EMAIL}. Website: ${LEGAL_SITE_URL}.`,
      ],
    },
  ],
}

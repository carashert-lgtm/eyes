import type { LegalDocument } from './types'
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_SITE_URL } from './meta'

export const riskDisclosure: LegalDocument = {
  slug: 'risk-disclosure',
  title: 'Risk Disclosure',
  description:
    'Important warnings about cryptocurrency, $EYES, smart contracts, and experimental software.',
  summary: 'Crypto is high risk. Read this before sending funds or using the platform.',
  sections: [
    {
      id: 'read-first',
      title: '1. Read this first',
      paragraphs: [
        `${LEGAL_ENTITY} ("Eyes Open") provides experimental software and community tools. Digital assets are highly volatile and speculative. You may lose some or all of the value you contribute or hold.`,
        'This Risk Disclosure supplements our Terms of Service. It is not exhaustive. You bear full responsibility for your decisions.',
        `Before sending funds, verify contract and treasury addresses on ${LEGAL_SITE_URL}/legal—not from DMs or unofficial posts.`,
      ],
    },
    {
      id: 'not-investment',
      title: '2. Not an investment offer',
      paragraphs: [
        'Holding $EYES, using the launch platform, or earning referral or team pool allocations is not guaranteed to produce profit or return of capital.',
        'We make no promise that $EYES will maintain value, list on exchanges, achieve liquidity, or appreciate. Marketing about tokenomics, flywheels, burns, or "fair launch" mechanics describes intended protocol design—not assured outcomes.',
        'Nothing here or on Discord, Telegram, X, or the website should be interpreted as a prospectus, securities offering, or investment contract in any jurisdiction.',
      ],
    },
    {
      id: 'crypto-risks',
      title: '3. General cryptocurrency risks',
      bullets: [
        'Extreme price volatility and total loss of value.',
        'Regulatory change, enforcement actions, or asset classification that restricts use or trading.',
        'Irreversible transactions—blockchain transfers cannot be undone by Eyes Open.',
        'Wallet compromise, phishing, SIM swaps, and loss of private keys.',
        'Network congestion, failed transactions, and variable gas fees.',
        'Bridge, RPC, or indexer failures causing delays or incorrect UI state.',
        'Tax obligations in your jurisdiction (we do not provide tax advice).',
      ],
      paragraphs: [],
    },
    {
      id: 'founder-share',
      title: '4. Owner allocation (10%)',
      paragraphs: [
        'Eyes Open discloses a 10% owner allocation of total supply (100,000,000 $EYES of 1B) to a single owner recipient.',
        'These tokens are subject to vesting, Team Space rules, and manual unlock milestones — they are not guaranteed to be liquid at launch. Owner sales on secondary markets may affect price.',
        'Always verify current disclosures on the tokenomics page before participating.',
      ],
    },
    {
      id: 'transfer-risks',
      title: '5. Wallet and transfer risks',
      bullets: [
        'Sending native assets or tokens to any address is irreversible.',
        'Wrong network (not the chain you intended) can result in permanent loss.',
        'Wrong recipient address means funds may go to an address you do not control.',
        'On-chain verification may fail if a transaction is invalid, duplicated, or below published minimums.',
        'Token delivery from treasury operations depends on gas availability and queue processing—delays or failures are possible.',
        'Treasury transfers are not deposited into a smart contract escrow on mainnet; they are native transfers to a published wallet.',
      ],
      paragraphs: [],
    },
    {
      id: 'smart-contract',
      title: '6. Smart contract and protocol risks',
      bullets: [
        'Bugs, exploits, or economic attacks in smart contracts—even audited code can fail.',
        'Admin keys, upgradeability, or misconfiguration until multisig ownership is completed.',
        'Liquidity pool risks: impermanent loss, low liquidity, rug pulls on third-party tokens (not Eyes Open launches you did not verify).',
        'Oracle or pricing errors affecting displayed stats or fees.',
        'Contracts shown on testnet or Anvil are not mainnet deployments unless explicitly labeled and verified on BaseScan.',
      ],
      paragraphs: [
        'Check BaseScan verification status and official addresses from eyesopen.to only. Impersonation sites and fake tokens are common.',
      ],
    },
    {
      id: 'no-liquidity',
      title: '7. Liquidity and trading',
      paragraphs: [
        'At launch phases where no decentralized exchange liquidity pool exists, $EYES may not be tradable on DEXs. Secondary market access, if any, may be limited or absent.',
        'Future LP seeding and trading involve additional risks including slippage, MEV, and market manipulation.',
      ],
    },
    {
      id: 'discord-bot',
      title: '8. Discord bot and off-chain systems',
      bullets: [
        '!linkwallet stores an address without cryptographic proof of ownership—ensure you control the address you link.',
        'Bot downtime, database loss, or misconfiguration could delay claims or distributions.',
        'Staff and owner commands (grants, distributions) involve human operational risk.',
        'Discord account compromise could affect linked allocations or social engineering attacks.',
      ],
      paragraphs: [],
    },
    {
      id: 'referral-team',
      title: '9. Referral and team pool programs',
      paragraphs: [
        'Referral clicks, invite rewards, locked/unlocked balances, and team allocations are programmatic and discretionary. They may be adjusted, reversed, or discontinued for abuse prevention or policy compliance.',
        'Locked tokens may never unlock if milestones are not met. Unlocked tokens still carry market and delivery risk.',
      ],
    },
    {
      id: 'ai',
      title: '10. AI-generated content',
      paragraphs: [
        'We may use artificial intelligence tools to draft documentation, marketing, support responses, or code. AI output can be inaccurate, outdated, or misleading.',
        'Do not rely on AI summaries for financial decisions. Verify all addresses, dates, and amounts from official site pages and block explorers. See our AI Disclosure.',
      ],
    },
    {
      id: 'jurisdiction',
      title: '11. Regulatory and geographic risk',
      paragraphs: [
        'Laws governing digital assets vary worldwide and change rapidly. The Services may become unavailable in your region without notice.',
        'You are solely responsible for compliance. If participation is unlawful where you live, do not use the Services.',
      ],
    },
    {
      id: 'acknowledgment',
      title: '12. Your acknowledgment',
      paragraphs: [
        'By using the Services, sending funds, linking a wallet, or registering a purchase, you acknowledge that you have read this Risk Disclosure, understand these risks, and accept full responsibility for your actions.',
        `Questions: ${LEGAL_CONTACT_EMAIL}. Website: ${LEGAL_SITE_URL}.`,
      ],
    },
  ],
}
